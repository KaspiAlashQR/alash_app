import ReactNativeBlobUtil from 'react-native-blob-util';
import { AppState, DeviceEventEmitter } from 'react-native';

type LogLevel = 'LOG' | 'WARN' | 'ERROR';
interface LogEntry { time: string; level: LogLevel; message: string }

const MAX_ENTRIES = 5000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const filePath = () => `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/diagnostics-current.txt`;
const previousPath = () => `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/diagnostics-previous.txt`;
let logBuffer: LogEntry[] = [];
let logStartTime = new Date();
let flushTimer: ReturnType<typeof setInterval> | null = null;
let subscriptions: Array<{ remove: () => void }> = [];
let isStarted = false;
let pending: string[] = [];
let flushing: Promise<void> = Promise.resolve();
const originalConsole = { log: console.log.bind(console), warn: console.warn.bind(console), error: console.error.bind(console) };

function redact(text: string): string {
  return text
    .replace(/("(?:[^"]*(?:token|password|secret|authorization|email)[^"]*)"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/((?:accessToken|playToken|appSecret|password|email)\s*[:=]\s*)[^\s,}]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)\S+/gi, '$1[REDACTED]');
}

function formatArgs(args: unknown[]): string {
  return redact(args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    try { return JSON.stringify(arg); } catch { return String(arg); }
  }).join(' ')).slice(0, 8000);
}

function addEntry(level: LogLevel, args: unknown[]) {
  const entry = { time: new Date().toISOString(), level, message: formatArgs(args) };
  if (logBuffer.length >= MAX_ENTRIES) logBuffer.shift();
  logBuffer.push(entry);
  pending.push(`[${entry.time}] [${entry.level}] ${entry.message}\n`);
  if (pending.length > MAX_ENTRIES) pending.shift();
  if (level === 'ERROR' || /\[(CameraSession|RecordingQueue|ImouNative|Payment)\]/.test(entry.message)) {
    void flushDiagnosticLogs();
  }
}

export function flushDiagnosticLogs(): Promise<void> {
  flushing = flushing.then(async () => {
    if (!pending.length) return;
    const lines = pending.splice(0);
    try {
      const path = filePath();
      const chunks: string[] = [];
      let chunk = '';
      for (const line of lines) {
        if ((chunk.length + line.length) * 3 > MAX_FILE_BYTES) {
          chunks.push(chunk);
          chunk = '';
        }
        chunk += line;
      }
      if (chunk) chunks.push(chunk);
      for (const text of chunks) {
        if (await ReactNativeBlobUtil.fs.exists(path)) {
          const stat = await ReactNativeBlobUtil.fs.stat(path);
          if (Number(stat.size) + text.length * 3 > MAX_FILE_BYTES) {
            if (await ReactNativeBlobUtil.fs.exists(previousPath())) await ReactNativeBlobUtil.fs.unlink(previousPath());
            await ReactNativeBlobUtil.fs.mv(path, previousPath());
          }
        }
        await ReactNativeBlobUtil.fs.appendFile(path, text, 'utf8');
      }
    } catch (error) {
      pending = [...lines, ...pending].slice(-MAX_ENTRIES);
      originalConsole.warn('[Diag] persist_failed', String(error));
    }
  });
  return flushing;
}

export function startDiagnosticLogger() {
  if (isStarted) return;
  isStarted = true;
  logStartTime = new Date();
  console.log = (...args: unknown[]) => { originalConsole.log(...args); addEntry('LOG', args); };
  console.warn = (...args: unknown[]) => { originalConsole.warn(...args); addEntry('WARN', args); };
  console.error = (...args: unknown[]) => { originalConsole.error(...args); addEntry('ERROR', args); };
  subscriptions = [
    DeviceEventEmitter.addListener('ImouDiagnostic', event => console.log('[ImouNative]', event)),
    AppState.addEventListener('change', () => { void flushDiagnosticLogs(); }),
  ];
  flushTimer = setInterval(() => { void flushDiagnosticLogs(); }, 2000);
  console.log('[Diag] process_started', { retention: 'two rotating files, 2 MiB each' });
}

export function stopDiagnosticLogger() {
  if (!isStarted) return;
  void flushDiagnosticLogs();
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  subscriptions.forEach(subscription => subscription.remove());
  subscriptions = [];
  isStarted = false;
}

export function getLogStartTime(): Date { return logStartTime; }
export function getLogCount(): number { return logBuffer.length; }
export function getLogsAsText(): string {
  return logBuffer.map(entry => `[${entry.time}] [${entry.level}] ${entry.message}`).join('\n') || 'Логи отсутствуют';
}

export async function getDiagnosticLogsAsText(): Promise<string> {
  await flushDiagnosticLogs();
  try {
    const parts: string[] = [];
    for (const path of [previousPath(), filePath()]) {
      if (await ReactNativeBlobUtil.fs.exists(path)) parts.push(await ReactNativeBlobUtil.fs.readFile(path, 'utf8'));
    }
    if (pending.length) parts.push(pending.join(''));
    return parts.join('\n') || getLogsAsText();
  } catch (error) {
    originalConsole.warn('[Diag] read_failed', String(error));
    return getLogsAsText();
  }
}
