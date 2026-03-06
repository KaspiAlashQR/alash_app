type LogLevel = 'LOG' | 'WARN' | 'ERROR';

interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

const MAX_ENTRIES = 5000;
const HOUR_MS = 60 * 60 * 1000;

let logBuffer: LogEntry[] = [];
let logStartTime: Date = new Date();
let hourlyTimer: ReturnType<typeof setInterval> | null = null;
let isStarted = false;

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function formatArgs(args: any[]): string {
  return args
    .map(a => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function addEntry(level: LogLevel, args: any[]) {
  if (logBuffer.length >= MAX_ENTRIES) {
    logBuffer.shift();
  }
  logBuffer.push({
    time: new Date().toISOString(),
    level,
    message: formatArgs(args),
  });
}

function resetBuffer() {
  logBuffer = [];
  logStartTime = new Date();
}

export function startDiagnosticLogger() {
  if (isStarted) return;
  isStarted = true;
  logStartTime = new Date();

  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    addEntry('LOG', args);
  };
  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    addEntry('WARN', args);
  };
  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    addEntry('ERROR', args);
  };

  // Reset buffer every hour to avoid memory buildup
  hourlyTimer = setInterval(() => {
    resetBuffer();
  }, HOUR_MS);
}

export function stopDiagnosticLogger() {
  if (!isStarted) return;
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  if (hourlyTimer) {
    clearInterval(hourlyTimer);
    hourlyTimer = null;
  }
  isStarted = false;
}

export function getLogStartTime(): Date {
  return logStartTime;
}

export function getLogCount(): number {
  return logBuffer.length;
}

export function getLogsAsText(): string {
  if (logBuffer.length === 0) {
    return 'Логи отсутствуют';
  }
  return logBuffer
    .map(e => `[${e.time}] [${e.level}] ${e.message}`)
    .join('\n');
}
