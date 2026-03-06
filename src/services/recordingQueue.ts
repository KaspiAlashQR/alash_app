import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { uploadFileToS3, deleteLocalFile } from './s3Upload';
import { S3_CONFIG } from './s3Config';
import { updateOrder } from '../api/orders';

export type PendingRecording = {
  orderId: number;
  filePath: string;
  createdAt: string;
  uploaded: boolean;
};

const STORAGE_KEY = 'pending_recordings';
let isProcessing = false;

async function loadAll(): Promise<PendingRecording[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('recordingQueue loadAll error:', error);
    return [];
  }
}

async function saveAll(items: PendingRecording[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('recordingQueue saveAll error:', error);
  }
}

export async function addPendingRecording(record: PendingRecording): Promise<void> {
  const items = await loadAll();
  const idx = items.findIndex(i => i.orderId === record.orderId);
  if (idx >= 0) {
    items[idx] = record;
  } else {
    items.push(record);
  }
  await saveAll(items);
}

export async function markRecordingUploaded(orderId: number): Promise<void> {
  const items = await loadAll();
  const idx = items.findIndex(i => i.orderId === orderId);
  if (idx >= 0) {
    items[idx] = { ...items[idx], uploaded: true };
    await saveAll(items);
  }
}

export async function getPendingRecordings(): Promise<PendingRecording[]> {
  return loadAll();
}


async function processOne(record: PendingRecording): Promise<boolean> {
  const s3Key = `${S3_CONFIG.recordingsPrefix}${record.orderId}.mp4`;

  // Логируем размер файла перед загрузкой
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(record.filePath);
    if (exists) {
      const stat = await ReactNativeBlobUtil.fs.stat(record.filePath);
      console.log(`[Upload] Recording ${record.orderId}: file exists, size=${stat.size} bytes (${(Number(stat.size) / 1024).toFixed(1)} KB), path=${record.filePath}`);
    } else {
      console.warn(`[Upload] Recording ${record.orderId}: file NOT FOUND at ${record.filePath}`);
    }
  } catch (e) {
    console.error(`[Upload] Recording ${record.orderId}: file stat error:`, e);
  }

  console.log(`Uploading recording ${record.orderId} -> s3://${S3_CONFIG.bucket}/${s3Key}`);
  const result = await uploadFileToS3(record.filePath, s3Key);

  if (result.success) {
    const publicUrl = `https://${S3_CONFIG.bucket}.${S3_CONFIG.endpoint}/${s3Key}`;
    const resp = await updateOrder(record.orderId, { url: publicUrl });
    if (resp.error) {
      console.error(`updateOrder url failed for ${record.orderId}:`, resp.error);
    } else {
      console.log(`Order ${record.orderId} updated with recording url`);
    }
    await deleteLocalFile(record.filePath);
    const items = await loadAll();
    const filtered = items.filter(i => i.orderId !== record.orderId);
    await saveAll(filtered);
    console.log(`Recording ${record.orderId} uploaded and cleaned up`);
    return true;
  } else {
    console.error(`Recording ${record.orderId} upload failed: ${result.error}`);
    return false;
  }
}


export async function processUploadQueue(): Promise<void> {
  if (isProcessing) {
    console.log('Upload queue already processing, skipping');
    return;
  }

  isProcessing = true;
  try {
    const items = await loadAll();
    const pending = items.filter(i => !i.uploaded);

    if (pending.length === 0) {
      console.log('No pending recordings to upload');
      return;
    }

    console.log(`Processing ${pending.length} pending recording(s)`);
    for (const record of pending) {
      await processOne(record);
    }
  } catch (error) {
    console.error('processUploadQueue error:', error);
  } finally {
    isProcessing = false;
  }
}
