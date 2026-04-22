import ReactNativeBlobUtil from 'react-native-blob-util';
import CryptoJS from 'crypto-js';
import { S3_CONFIG } from './s3Config';

const APK_CONTENT_TYPE = 'application/vnd.android.package-archive';
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

function hmacSha256(key: CryptoJS.lib.WordArray | string, data: string): CryptoJS.lib.WordArray {
  return CryptoJS.HmacSHA256(data, key);
}

function hmacSha256Hex(key: CryptoJS.lib.WordArray | string, data: string): string {
  return hmacSha256(key, data).toString(CryptoJS.enc.Hex);
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): CryptoJS.lib.WordArray {
  const kDate = hmacSha256('AWS4' + secretKey, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function toAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function buildPublicUrl(s3Key: string): string {
  return `https://${S3_CONFIG.bucket}.${S3_CONFIG.endpoint}/${s3Key}`;
}

function encodeS3PathSegment(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%2F/g, '/');
}

async function uploadBinaryReleaseFile(
  filePath: string,
  s3Key: string,
  contentType: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { bucket, endpoint, region, accessKeyId, secretAccessKey } = S3_CONFIG;

    const exists = await ReactNativeBlobUtil.fs.exists(filePath);
    if (!exists) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const stat = await ReactNativeBlobUtil.fs.stat(filePath);
    const fileSize = stat.size;

    const fileBase64 = await ReactNativeBlobUtil.fs.readFile(filePath, 'base64');
    const fileBytes = CryptoJS.enc.Base64.parse(fileBase64);
    const contentHash = CryptoJS.SHA256(fileBytes).toString(CryptoJS.enc.Hex);

    const now = new Date();
    const { amzDate, dateStamp } = toAmzDate(now);

    const host = `${bucket}.${endpoint}`;
    const url = `https://${host}/${s3Key}`;
    const method = 'PUT';

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${contentHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      method,
      '/' + s3Key,
      '',
      canonicalHeaders,
      signedHeaders,
      contentHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join('\n');

    const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
    const signature = hmacSha256Hex(signingKey, stringToSign);

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await ReactNativeBlobUtil.fetch(
      'PUT',
      url,
      {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'x-amz-content-sha256': contentHash,
        'x-amz-date': amzDate,
        Authorization: authorization,
      },
      ReactNativeBlobUtil.wrap(filePath),
    );

    const status = response.info().status;
    if (status >= 200 && status < 300) {
      console.log(`[Release] Upload OK: ${s3Key} (${fileSize} bytes, ${contentType})`);
      return { success: true, url: buildPublicUrl(s3Key) };
    } else {
      const body = response.text();
      console.error(`[Release] Upload failed (${status}): ${body}`);
      return { success: false, error: `HTTP ${status}: ${body}` };
    }
  } catch (error: any) {
    console.error('[Release] Upload exception:', error?.message || error);
    return { success: false, error: error?.message || 'Upload failed' };
  }
}

export function buildReleaseApkKey(version: string, fileName: string = 'app-release.apk'): string {
  const safeVersion = encodeS3PathSegment(version);
  const safeFileName = encodeS3PathSegment(fileName);
  return `${S3_CONFIG.releasesPrefix}${safeVersion}/${safeFileName}`;
}

export function buildReleaseManifestKey(version: string): string {
  const safeVersion = encodeS3PathSegment(version);
  return `${S3_CONFIG.releasesPrefix}${safeVersion}/manifest.json`;
}

export function getLatestReleaseManifestKey(): string {
  return S3_CONFIG.latestReleaseManifest;
}

export function buildReleaseApkUrl(version: string, fileName: string = 'app-release.apk'): string {
  return buildPublicUrl(buildReleaseApkKey(version, fileName));
}

export async function uploadApkReleaseToS3(
  filePath: string,
  version: string,
  fileName: string = 'app-release.apk',
): Promise<{ success: boolean; url?: string; error?: string; s3Key?: string }> {
  const s3Key = buildReleaseApkKey(version, fileName);
  const result = await uploadBinaryReleaseFile(filePath, s3Key, APK_CONTENT_TYPE);
  return { ...result, s3Key };
}

export async function uploadReleaseManifestToS3(
  filePath: string,
  version: string,
): Promise<{ success: boolean; url?: string; error?: string; s3Key?: string }> {
  const s3Key = buildReleaseManifestKey(version);
  const result = await uploadTextReleaseFile(filePath, s3Key, JSON_CONTENT_TYPE);
  return { ...result, s3Key };
}

export async function uploadLatestReleaseManifestToS3(
  filePath: string,
): Promise<{ success: boolean; url?: string; error?: string; s3Key?: string }> {
  const s3Key = getLatestReleaseManifestKey();
  const result = await uploadTextReleaseFile(filePath, s3Key, JSON_CONTENT_TYPE);
  return { ...result, s3Key };
}

async function uploadTextReleaseFile(
  filePath: string,
  s3Key: string,
  contentType: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { bucket, endpoint, region, accessKeyId, secretAccessKey } = S3_CONFIG;

    const exists = await ReactNativeBlobUtil.fs.exists(filePath);
    if (!exists) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const stat = await ReactNativeBlobUtil.fs.stat(filePath);
    const fileSize = stat.size;

    const fileContent = await ReactNativeBlobUtil.fs.readFile(filePath, 'utf8');
    const contentHash = sha256(fileContent);

    const now = new Date();
    const { amzDate, dateStamp } = toAmzDate(now);

    const host = `${bucket}.${endpoint}`;
    const url = `https://${host}/${s3Key}`;
    const method = 'PUT';

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${contentHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      method,
      '/' + s3Key,
      '',
      canonicalHeaders,
      signedHeaders,
      contentHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join('\n');

    const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
    const signature = hmacSha256Hex(signingKey, stringToSign);

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await ReactNativeBlobUtil.fetch(
      'PUT',
      url,
      {
        'Content-Type': contentType,
        'x-amz-content-sha256': contentHash,
        'x-amz-date': amzDate,
        Authorization: authorization,
      },
      fileContent,
    );

    const status = response.info().status;
    if (status >= 200 && status < 300) {
      console.log(`[Release] Upload OK: ${s3Key} (${fileSize} bytes, ${contentType})`);
      return { success: true, url: buildPublicUrl(s3Key) };
    } else {
      const body = response.text();
      console.error(`[Release] Upload failed (${status}): ${body}`);
      return { success: false, error: `HTTP ${status}: ${body}` };
    }
  } catch (error: any) {
    console.error('[Release] Upload exception:', error?.message || error);
    return { success: false, error: error?.message || 'Upload failed' };
  }
}
