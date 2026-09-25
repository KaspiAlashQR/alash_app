import { CameraSession } from '../src/services/cameraSession';
import { deviceStorage } from '../src/api/storage';
import { imouTokenService } from '../Imou/typescript/imou.token-service';
import { addPendingRecording, markRecordingReady } from '../src/services/recordingQueue';

jest.mock('../src/api/storage', () => ({ deviceStorage: { getCameraSettings: jest.fn() } }));
jest.mock('../Imou/typescript/imou.token-service', () => ({ imouTokenService: { getCameraTokens: jest.fn() } }));
jest.mock('../src/services/recordingQueue', () => ({
  addPendingRecording: jest.fn().mockResolvedValue(undefined),
  markRecordingReady: jest.fn().mockResolvedValue(undefined),
  processUploadQueue: jest.fn().mockResolvedValue(undefined),
}));

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const player = () => ({ startPreview: jest.fn(), stopPreview: jest.fn(), startRecord: jest.fn(), stopRecord: jest.fn() });

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-25T12:00:00Z'));
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  (deviceStorage.getCameraSettings as jest.Mock).mockResolvedValue({ deviceId: 'camera', password: 'stored-password' });
  (imouTokenService.getCameraTokens as jest.Mock).mockResolvedValue({ accessToken: 'access', playToken: 'play' });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

test('QR prepares once, payment reuses the same player and records only after payment', async () => {
  const session = new CameraSession();
  const view = player();
  session.begin(101);
  await flush();
  const { id, attempt } = session.getSnapshot();
  session.attach(view);
  session.playStarted(id, attempt);
  expect(view.startRecord).not.toHaveBeenCalled();
  session.paid(101);
  session.paid(101);
  expect(view.startRecord).toHaveBeenCalledTimes(1);
  expect(imouTokenService.getCameraTokens).toHaveBeenCalledTimes(1);
  expect(session.getSnapshot().id).toBe(id);
  expect(session.getSnapshot().parameters).not.toHaveProperty('password');
  expect(imouTokenService.getCameraTokens).toHaveBeenCalledWith('camera');
  session.recordStarted(id, attempt, '/101.mp4');
  session.leave(101);
  expect(session.getSnapshot().phase).toBe('recording');
  jest.advanceTimersByTime(15_000);
  expect(view.stopRecord).toHaveBeenCalledTimes(1);
  await session.recordStopped(id, attempt, '/101.mp4');
  expect(markRecordingReady).toHaveBeenCalledWith(101, '/101.mp4');
  expect(session.getSnapshot().phase).toBe('idle');
});

test('cancel ignores late token completion and never starts a video session', async () => {
  let resolve!: (value: object) => void;
  (deviceStorage.getCameraSettings as jest.Mock).mockReturnValue(new Promise(r => { resolve = r; }));
  const session = new CameraSession();
  session.begin(102);
  session.leave(102);
  resolve({ deviceId: 'camera' });
  await flush();
  expect(session.getSnapshot().phase).toBe('idle');
  expect(imouTokenService.getCameraTokens).not.toHaveBeenCalled();
});

test('connection retries are bounded and callbacks from a previous attempt are ignored', async () => {
  const session = new CameraSession();
  session.begin(103);
  await flush();
  const { id, attempt } = session.getSnapshot();
  session.fail(id, attempt, 'network');
  jest.advanceTimersByTime(2000);
  await flush();
  session.playStarted(id, attempt);
  expect(session.getSnapshot().phase).toBe('connecting');
  session.fail(id, 2, 'network');
  jest.advanceTimersByTime(4000);
  await flush();
  session.fail(id, 3, 'network');
  jest.advanceTimersByTime(10_000);
  expect(session.getSnapshot().attempt).toBe(3);
  expect(session.getSnapshot().phase).toBe('failed');
});

test('unpaid QR is bounded to two minutes', async () => {
  const session = new CameraSession();
  session.begin(104);
  await flush();
  const { id, attempt } = session.getSnapshot();
  session.playStarted(id, attempt);
  jest.advanceTimersByTime(120_000);
  expect(session.getSnapshot().phase).toBe('idle');
  expect(addPendingRecording).not.toHaveBeenCalled();
});

test('late camera cannot start recording beyond the paid window', async () => {
  const session = new CameraSession();
  const view = player();
  session.begin(105);
  await flush();
  const { id, attempt } = session.getSnapshot();
  session.attach(view);
  session.paid(105);
  jest.advanceTimersByTime(15_000);
  session.playStarted(id, attempt);
  expect(view.startRecord).not.toHaveBeenCalled();
  expect(session.getSnapshot().phase).toBe('idle');
});

test('next checkout waits for previous finalization without destroying its recording', async () => {
  const session = new CameraSession();
  const view = player();
  session.begin(106);
  await flush();
  const { id, attempt } = session.getSnapshot();
  session.attach(view);
  session.playStarted(id, attempt);
  session.paid(106);
  session.recordStarted(id, attempt, '/106.mp4');
  session.begin(107);
  session.paid(107);
  expect(session.getSnapshot().orderId).toBe(106);
  await session.recordStopped(id, attempt, '/106.mp4');
  await flush();
  expect(session.getSnapshot().orderId).toBe(107);
  expect(session.getSnapshot().phase).toBe('connecting');
});
