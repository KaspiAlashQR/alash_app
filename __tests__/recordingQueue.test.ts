import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImouModule } from '../Imou/typescript/imou.config';
import { addPendingRecording, getPendingRecordings, markRecordingReady, processUploadQueue, recoverRecordings } from '../src/services/recordingQueue';
import { uploadFileToS3, deleteLocalFile } from '../src/services/s3Upload';
import { updateOrder } from '../src/api/orders';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-blob-util', () => ({ fs: { stat: jest.fn().mockResolvedValue({ size: 1000 }) } }));
jest.mock('../Imou/typescript/imou.config', () => ({ ImouModule: { validateRecording: jest.fn().mockResolvedValue(true) } }));
jest.mock('../src/services/s3Upload', () => ({ uploadFileToS3: jest.fn(), deleteLocalFile: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../src/services/s3Config', () => ({ S3_CONFIG: { recordingsPrefix: 'records/', bucket: 'bucket', endpoint: 'example.test' } }));
jest.mock('../src/api/orders', () => ({ updateOrder: jest.fn() }));

const record = (id: number, ready = true) => ({ orderId: id, filePath: `/${id}.mp4`, createdAt: new Date().toISOString(), uploaded: false, ready });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (uploadFileToS3 as jest.Mock).mockResolvedValue({ success: true });
  (updateOrder as jest.Mock).mockResolvedValue({ OK: true });
  (ImouModule.validateRecording as jest.Mock).mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());

test('does not upload a file that is still being recorded', async () => {
  await addPendingRecording(record(1, false));
  await processUploadQueue();
  expect(uploadFileToS3).not.toHaveBeenCalled();
  await markRecordingReady(1, '/1.mp4');
  await processUploadQueue();
  expect(uploadFileToS3).toHaveBeenCalledTimes(1);
});

test('retains file and queue when order URL update fails, retries without reuploading S3', async () => {
  await addPendingRecording(record(2));
  (updateOrder as jest.Mock).mockResolvedValueOnce({ error: 'offline' });
  await processUploadQueue();
  expect(deleteLocalFile).not.toHaveBeenCalled();
  expect((await getPendingRecordings())[0].uploaded).toBe(true);
  await processUploadQueue();
  expect(uploadFileToS3).toHaveBeenCalledTimes(1);
  expect(deleteLocalFile).toHaveBeenCalledTimes(1);
  expect(await getPendingRecordings()).toEqual([]);
});

test('failed S3 upload does not block the next order or remove failed order', async () => {
  await Promise.all([addPendingRecording(record(3)), addPendingRecording(record(4))]);
  (uploadFileToS3 as jest.Mock).mockResolvedValueOnce({ success: false, error: 'offline' });
  await processUploadQueue();
  expect((await getPendingRecordings()).map(item => item.orderId)).toEqual([3]);
  expect(updateOrder).toHaveBeenCalledWith(4, expect.any(Object));
});

test('startup recovers only finalized MP4 files after process interruption', async () => {
  await Promise.all([addPendingRecording(record(5, false)), addPendingRecording(record(6, false))]);
  (ImouModule.validateRecording as jest.Mock).mockImplementation(async (path: string) => path === '/5.mp4');
  await recoverRecordings();
  expect(uploadFileToS3).toHaveBeenCalledTimes(1);
  expect((await getPendingRecordings()).map(item => item.orderId)).toEqual([6]);
});

test('storage errors propagate rather than silently dropping a recording', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(addPendingRecording(record(7))).rejects.toThrow('disk full');
});
