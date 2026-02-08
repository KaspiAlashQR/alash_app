import ReactNativeBlobUtil from 'react-native-blob-util';
import CryptoJS from 'crypto-js';
import { S3_CONFIG } from './s3Config';

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
    amzDate: iso,           // 20260208T180000Z
    dateStamp: iso.slice(0, 8), // 20260208
  };
}

export async function uploadFileToS3(
  filePath: string,
  s3Key: string,
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
    const contentType = 'video/mp4';

    // Canonical headers
    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${contentHash}\n` +
      `x-amz-date:${amzDate}\n`;

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';


    const canonicalRequest = [
      method,
      '/' + s3Key,
      '',  // query string
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
      console.log(`S3 upload OK: ${s3Key} (${fileSize} bytes)`);
      return { success: true, url };
    } else {
      const body = response.text();
      console.error(`S3 upload failed (${status}): ${body}`);
      return { success: false, error: `HTTP ${status}: ${body}` };
    }
  } catch (error: any) {
    console.error('S3 upload exception:', error);
    return { success: false, error: error?.message || 'Upload failed' };
  }
}

export async function deleteLocalFile(filePath: string): Promise<void> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(filePath);
    if (exists) {
      await ReactNativeBlobUtil.fs.unlink(filePath);
      console.log(`Deleted local file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error);
  }
}
