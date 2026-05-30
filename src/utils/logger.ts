export type LogLevel = 'info' | 'warn' | 'error';

export function log(message: string, level: LogLevel = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case 'error':
      console.error(`${prefix} ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`);
      break;
    case 'info':
    default:
      console.log(`${prefix} ${message}`);
      break;
  }
}
