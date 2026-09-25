import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { ImouModule } from '../../Imou/typescript/imou.config';
import { uploadFileToS3, deleteLocalFile } from './s3Upload';
import { S3_CONFIG } from './s3Config';
import { updateOrder } from '../api/orders';

export type PendingRecording = {
  orderId: number;
  filePath: string;
  createdAt: string;
  uploaded: boolean;
  ready?: boolean;
};

const STORAGE_KEY = 'pending_recordings';
let mutation: Promise<unknown> = Promise.resolve();
let processing: Promise<void> | null = null;
let rerun = false;

async function loadAll(): Promise<PendingRecording[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Invalid recording queue');
  return data;
}

function mutate(update: (items: PendingRecording[]) => PendingRecording[]): Promise<void> {
  const work = mutation.then(async () => {
    const items = update(await loadAll());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  });
  mutation = work.catch(() => {});
  return work;
}

export function addPendingRecording(record: PendingRecording): Promise<void> {
  return mutate(items => [...items.filter(item => item.orderId !== record.orderId), record]);
}

export function markRecordingReady(orderId: number, filePath: string): Promise<void> {
  return mutate(items => {
    const existing = items.find(item => item.orderId === orderId);
    const record = existing ?? { orderId, filePath, createdAt: new Date().toISOString(), uploaded: false };
    return [...items.filter(item => item.orderId !== orderId), { ...record, ready: true }];
  });
}

export function markRecordingUploaded(orderId: number): Promise<void> {
  return mutate(items => items.map(item => item.orderId === orderId ? { ...item, uploaded: true } : item));
}

export async function getPendingRecordings(): Promise<PendingRecording[]> {
  await mutation;
  return loadAll();
}

async function processOne(record: PendingRecording): Promise<void> {
  if (record.ready === false) return;
  console.log('[RecordingQueue] processing', { orderId: record.orderId, uploaded: record.uploaded });
  const s3Key = `${S3_CONFIG.recordingsPrefix}${record.orderId}.mp4`;
  if (!record.uploaded) {
    const valid = await ImouModule.validateRecording(record.filePath);
    if (!valid) throw new Error('MP4 validation failed');
    const stat = await ReactNativeBlobUtil.fs.stat(record.filePath);
    console.log('[RecordingQueue] upload_start', { orderId: record.orderId, bytes: Number(stat.size) });
    const result = await uploadFileToS3(record.filePath, s3Key);
    if (!result.success) throw new Error(result.error || 'S3 upload failed');
    await markRecordingUploaded(record.orderId);
    console.log('[RecordingQueue] upload_complete', { orderId: record.orderId });
  }
  const url = `https://${S3_CONFIG.bucket}.${S3_CONFIG.endpoint}/${s3Key}`;
  const response = await updateOrder(record.orderId, { url });
  if (!response || response.error) throw new Error(response?.error || 'Order URL update failed');
  console.log('[RecordingQueue] order_url_saved', { orderId: record.orderId });
  await deleteLocalFile(record.filePath);
  await mutate(items => items.filter(item => item.orderId !== record.orderId || item.filePath !== record.filePath));
  console.log('[RecordingQueue] complete', { orderId: record.orderId });
}

export function processUploadQueue(): Promise<void> {
  if (processing) {
    rerun = true;
    return processing;
  }
  processing = (async () => {
    do {
      rerun = false;
      const items = await getPendingRecordings();
      for (const item of items) {
        try { await processOne(item); }
        catch (error) { console.error('[RecordingQueue] retained_for_retry', { orderId: item.orderId, error: String(error) }); }
      }
    } while (rerun);
  })().catch(error => console.error('[RecordingQueue] read_failed', String(error)))
    .finally(() => { processing = null; });
  return processing;
}

export async function recoverRecordings(): Promise<void> {
  try {
    const items = await getPendingRecordings();
    for (const item of items) {
      if (item.ready !== false) continue;
      const valid = await ImouModule.validateRecording(item.filePath);
      console.log('[RecordingQueue] recovery', { orderId: item.orderId, valid });
      if (valid) await markRecordingReady(item.orderId, item.filePath);
    }
    await processUploadQueue();
  } catch (error) {
    console.error('[RecordingQueue] recovery_failed', String(error));
  }
}
