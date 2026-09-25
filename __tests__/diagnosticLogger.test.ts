import ReactNativeBlobUtil from 'react-native-blob-util';
import { DeviceEventEmitter } from 'react-native';
import { startDiagnosticLogger, stopDiagnosticLogger, flushDiagnosticLogs, getDiagnosticLogsAsText } from '../src/services/diagnosticLogger';

jest.mock('react-native-blob-util', () => {
  const files: Record<string, string> = {};
  return { fs: {
    dirs: { DocumentDir: '/documents' },
    exists: jest.fn(async (path: string) => path in files),
    stat: jest.fn(async (path: string) => ({ size: files[path]?.length || 0 })),
    appendFile: jest.fn(async (path: string, text: string) => { files[path] = (files[path] || '') + text; }),
    readFile: jest.fn(async (path: string) => files[path]),
    unlink: jest.fn(async (path: string) => { delete files[path]; }),
    mv: jest.fn(async (from: string, to: string) => { files[to] = files[from]; delete files[from]; }),
  } };
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => { stopDiagnosticLogger(); jest.clearAllTimers(); jest.useRealTimers(); });

test('native SDK events and errors survive logger restart and exclude credentials', async () => {
  startDiagnosticLogger();
  DeviceEventEmitter.emit('ImouDiagnostic', { event: 'play_failed', sessionId: 'order-123', detail: 'code=1234' });
  console.error('[CameraSession]', { orderId: 123, accessToken: 'secret-token', password: 'secret-password' });
  await flushDiagnosticLogs();
  stopDiagnosticLogger();
  startDiagnosticLogger();
  const text = await getDiagnosticLogsAsText();
  expect(text).toContain('play_failed');
  expect(text).toContain('order-123');
  expect(text).toContain('code=1234');
  expect(text).not.toContain('secret-token');
  expect(text).not.toContain('secret-password');
  expect(ReactNativeBlobUtil.fs.appendFile).toHaveBeenCalled();
});

test('a failed disk write is retained and retried on diagnostic export', async () => {
  startDiagnosticLogger();
  await flushDiagnosticLogs();
  (ReactNativeBlobUtil.fs.appendFile as jest.Mock).mockRejectedValueOnce(new Error('disk busy'));
  console.log('retry-this-diagnostic-event');
  await flushDiagnosticLogs();
  expect(await getDiagnosticLogsAsText()).toContain('retry-this-diagnostic-event');
});
