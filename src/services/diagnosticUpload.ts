import ReactNativeBlobUtil from 'react-native-blob-util';
import { uploadTextToS3 } from './s3Upload';
import { getDiagnosticLogsAsText } from './diagnosticLogger';
import { S3_CONFIG } from './s3Config';

function formatDateForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${y}-${mo}-${d}_${h}-${mi}`;
}

export async function uploadDiagnostics(
  machid: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  const now = new Date();
  const timestamp = formatDateForFilename(now);
  const safeMachid = machid.toString().replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${timestamp}_${safeMachid}.txt`;
  const s3Key = `${S3_CONFIG.logsPrefix}${fileName}`;

  const logsText = await getDiagnosticLogsAsText();
  if (!logsText) {
    return { success: false, error: 'No logs available' };
  }

  const tempPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/diag_${Date.now()}.txt`;

  try {
    await ReactNativeBlobUtil.fs.writeFile(tempPath, logsText, 'utf8');

    const exists = await ReactNativeBlobUtil.fs.exists(tempPath);
    if (!exists) {
      return { success: false, error: 'Failed to create temp file' };
    }

    const stat = await ReactNativeBlobUtil.fs.stat(tempPath);
    console.log(`[Diag] uploading logs: ${s3Key}, size=${stat.size} bytes`);

    const result = await uploadTextToS3(tempPath, s3Key);
    return result;
  } catch (error: any) {
    console.error('uploadDiagnostics error:', error);
    return { success: false, error: error?.message || 'Upload failed' };
  } finally {
    try {
      const exists = await ReactNativeBlobUtil.fs.exists(tempPath);
      if (exists) {
        await ReactNativeBlobUtil.fs.unlink(tempPath);
      }
    } catch (e) {
      console.error('cleanup error:', e);
    }
  }
}
