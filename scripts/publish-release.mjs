import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const buildGradlePath = path.join(repoRoot, 'android', 'app', 'build.gradle');
const apkPath = path.join(repoRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const s3ConfigPath = path.join(repoRoot, 'src', 'services', 's3Config.ts');

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key, data, encoding) {
  return crypto.createHmac('sha256', key).update(data).digest(encoding);
}

function toAmzDate(date) {
  const iso = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildCanonicalQuery(query) {
  return Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(String(value))}`)
    .join('&');
}

function compareVersionsDesc(a, b) {
  const aParts = a.split('.').map(part => Number.parseInt(part, 10) || 0);
  const bParts = b.split('.').map(part => Number.parseInt(part, 10) || 0);
  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i += 1) {
    const diff = (bParts[i] ?? 0) - (aParts[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function extractSingle(source, regex, label) {
  const match = source.match(regex);
  if (!match) {
    throw new Error(`Не удалось найти ${label}`);
  }
  return match[1];
}

async function loadReleaseContext() {
  const [packageRaw, gradleRaw, s3ConfigRaw] = await Promise.all([
    fs.readFile(packageJsonPath, 'utf8'),
    fs.readFile(buildGradlePath, 'utf8'),
    fs.readFile(s3ConfigPath, 'utf8'),
  ]);

  const packageJson = JSON.parse(packageRaw);
  const packageVersion = packageJson.version;
  const versionName = extractSingle(gradleRaw, /versionName\s+"([^"]+)"/, 'versionName');
  const versionCode = Number.parseInt(extractSingle(gradleRaw, /versionCode\s+(\d+)/, 'versionCode'), 10);

  if (packageVersion !== versionName) {
    throw new Error(`Версия не совпадает: package.json=${packageVersion}, build.gradle=${versionName}`);
  }

  const bucket = extractSingle(s3ConfigRaw, /bucket:\s+'([^']+)'/, 'S3 bucket');
  const endpoint = extractSingle(s3ConfigRaw, /endpoint:\s+'([^']+)'/, 'S3 endpoint');
  const region = extractSingle(s3ConfigRaw, /region:\s+'([^']+)'/, 'S3 region');
  const accessKeyId = extractSingle(s3ConfigRaw, /accessKeyId:\s+'([^']+)'/, 'S3 accessKeyId');
  const secretAccessKey = extractSingle(s3ConfigRaw, /secretAccessKey:\s+'([^']+)'/, 'S3 secretAccessKey');
  const releasesPrefix = extractSingle(s3ConfigRaw, /releasesPrefix:\s+'([^']+)'/, 'releasesPrefix');
  const latestReleaseManifest = extractSingle(s3ConfigRaw, /latestReleaseManifest:\s+'([^']+)'/, 'latestReleaseManifest');

  return {
    packageVersion,
    versionName,
    versionCode,
    bucket,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    releasesPrefix,
    latestReleaseManifest,
  };
}

function buildPublicUrl(context, key) {
  return `https://${context.bucket}.${context.endpoint}/${key}`;
}

function buildReleaseApkKey(context) {
  return `${context.releasesPrefix}${context.versionName}/app-release.apk`;
}

function buildReleaseManifestKey(context) {
  return `${context.releasesPrefix}${context.versionName}/manifest.json`;
}

async function s3Request(context, method, key, { query = {}, headers = {}, body } = {}) {
  const host = `${context.bucket}.${context.endpoint}`;
  const url = new URL(`https://${host}/${key}`);
  Object.entries(query).forEach(([name, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(name, String(value));
    }
  });

  const payloadBuffer = body === undefined
    ? Buffer.alloc(0)
    : Buffer.isBuffer(body)
      ? body
      : Buffer.from(body);
  const payloadHash = sha256Hex(payloadBuffer);
  const now = new Date();
  const { amzDate, dateStamp } = toAmzDate(now);
  const canonicalQuery = buildCanonicalQuery(query);

  const requestHeaders = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...headers,
  };

  const normalizedHeaders = Object.entries(requestHeaders)
    .map(([name, value]) => [name.toLowerCase(), String(value).trim().replace(/\s+/g, ' ')])
    .sort(([a], [b]) => a.localeCompare(b));

  const canonicalHeaders = normalizedHeaders
    .map(([name, value]) => `${name}:${value}\n`)
    .join('');
  const signedHeaders = normalizedHeaders.map(([name]) => name).join(';');

  const canonicalRequest = [
    method,
    `/${key}`,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${context.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(context.secretAccessKey, dateStamp, context.region, 's3');
  const signature = hmacSha256(signingKey, stringToSign, 'hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${context.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders = {
    ...Object.fromEntries(normalizedHeaders),
    authorization,
  };

  const response = await fetch(url, {
    method,
    headers: fetchHeaders,
    body: method === 'GET' ? undefined : payloadBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${method} ${key || '/'} failed: ${response.status} ${response.statusText} ${errorText}`);
  }

  return response;
}

async function uploadBinary(context, key, filePath, contentType) {
  const fileBuffer = await fs.readFile(filePath);
  await s3Request(context, 'PUT', key, {
    headers: {
      'content-type': contentType,
      'content-length': String(fileBuffer.length),
    },
    body: fileBuffer,
  });
  return buildPublicUrl(context, key);
}

async function uploadJson(context, key, payload) {
  const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await s3Request(context, 'PUT', key, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(body.length),
    },
    body,
  });
  return buildPublicUrl(context, key);
}

function parseListKeys(xml) {
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(match => match[1]);
}

async function listReleaseKeys(context) {
  const response = await s3Request(context, 'GET', '', {
    query: {
      'list-type': 2,
      prefix: context.releasesPrefix,
    },
  });
  const xml = await response.text();
  return parseListKeys(xml);
}

async function deleteObject(context, key) {
  await s3Request(context, 'DELETE', key);
}

async function cleanupOldReleases(context, keepCount = 3) {
  const keys = await listReleaseKeys(context);
  const versions = [...new Set(
    keys
      .map(key => {
        const match = key.match(/^releases\/([^/]+)\//);
        return match ? match[1] : null;
      })
      .filter(Boolean),
  )].sort(compareVersionsDesc);

  const versionsToDelete = versions.slice(keepCount);
  if (versionsToDelete.length === 0) {
    return [];
  }

  const keysToDelete = keys.filter(key =>
    versionsToDelete.some(version => key.startsWith(`${context.releasesPrefix}${version}/`)));

  for (const key of keysToDelete) {
    await deleteObject(context, key);
  }

  return versionsToDelete;
}

async function main() {
  const context = await loadReleaseContext();
  const apkStat = await fs.stat(apkPath).catch(() => null);
  if (!apkStat) {
    throw new Error(`APK не найден: ${apkPath}`);
  }

  const apkKey = buildReleaseApkKey(context);
  const versionManifestKey = buildReleaseManifestKey(context);
  const publishedAt = new Date().toISOString();
  const apkUrl = await uploadBinary(context, apkKey, apkPath, 'application/vnd.android.package-archive');

  const versionManifest = {
    version: context.versionName,
    versionCode: context.versionCode,
    apkUrl,
    apkKey,
    fileName: path.basename(apkPath),
    fileSize: apkStat.size,
    publishedAt,
    notes: '',
  };

  await uploadJson(context, versionManifestKey, versionManifest);
  await uploadJson(context, context.latestReleaseManifest, versionManifest);

  const deletedVersions = await cleanupOldReleases(context, 3);

  console.log(`[Release] Published version ${context.versionName}`);
  console.log(`[Release] APK: ${apkUrl}`);
  console.log(`[Release] latest.json: ${buildPublicUrl(context, context.latestReleaseManifest)}`);
  if (deletedVersions.length > 0) {
    console.log(`[Release] Deleted old versions: ${deletedVersions.join(', ')}`);
  }
}

main().catch(error => {
  console.error('[Release] Publish failed:', error.message);
  process.exit(1);
});
