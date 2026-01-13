/**
 * Centralized logging utility
 * Replaces console.log/error/warn with a production-ready logger
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private formatMessage(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  log(message: string, data?: any, context?: string) {
    if (isDev) {
      const entry = this.formatMessage('log', message, data, context);
      this.logs.push(entry);
      console.log(`[${entry.context || 'APP'}]`, message, data || '');
      this.trimLogs();
    }
  }

  error(message: string, error?: any, context?: string) {
    const entry = this.formatMessage('error', message, error, context);
    this.logs.push(entry);
    console.error(`[${entry.context || 'APP'}]`, message, error || '');
    this.trimLogs();
    
    // In production, send to error tracking service
    if (isProd && error) {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      this.reportError(error, context);
    }
  }

  warn(message: string, data?: any, context?: string) {
    if (isDev) {
      const entry = this.formatMessage('warn', message, data, context);
      this.logs.push(entry);
      console.warn(`[${entry.context || 'APP'}]`, message, data || '');
      this.trimLogs();
    }
  }

  info(message: string, data?: any, context?: string) {
    if (isDev) {
      const entry = this.formatMessage('info', message, data, context);
      this.logs.push(entry);
      console.info(`[${entry.context || 'APP'}]`, message, data || '');
      this.trimLogs();
    }
  }

  debug(message: string, data?: any, context?: string) {
    if (isDev && import.meta.env.VITE_DEBUG === 'true') {
      const entry = this.formatMessage('debug', message, data, context);
      this.logs.push(entry);
      console.debug(`[${entry.context || 'APP'}]`, message, data || '');
      this.trimLogs();
    }
  }

  private trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private reportError(error: any, context?: string) {
    // Integration with error tracking service
    // Example: Sentry.captureException(error, { tags: { context } });
    // For now, we just log it
    if (isDev) {
      console.error('Error to report:', error, context);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
