type LogLevel = 'INFO' | 'ERROR' | 'SUCCESS' | 'WARNING';

interface ApiRequestLog {
  method: string;
  url: string;
  headers: Record<string, any>;
  body?: any;
  timestamp: string;
}

interface ApiResponseLog {
  url: string;
  status: number;
  statusText: string;
  data: any;
  duration: number;
  timestamp: string;
}

interface ApiErrorLog {
  url: string;
  error: any;
  duration: number;
  timestamp: string;
}

class ApiLogger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, icon: string, title: string, data: any) {
    console.log(`\n${icon} ${title}`);
    console.log('─'.repeat(50));
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
    console.log('─'.repeat(50));
  }

  logRequest(method: string, url: string, headers: Record<string, any>, body?: any) {
    const requestData: ApiRequestLog = {
      method,
      url,
      headers,
      body,
      timestamp: this.formatTimestamp(),
    };

    this.log('INFO', '🚀', `API REQUEST: ${method} ${url}`, requestData);
  }

  logResponse(url: string, status: number, statusText: string, data: any, duration: number) {
    const responseData: ApiResponseLog = {
      url,
      status,
      statusText,
      data,
      duration,
      timestamp: this.formatTimestamp(),
    };

    const icon = status >= 200 && status < 300 ? '✅' : '⚠️';
    this.log('SUCCESS', icon, `API RESPONSE: ${status} ${statusText}`, responseData);
  }

  logError(url: string, error: any, duration: number) {
    const errorData: ApiErrorLog = {
      url,
      error: error.message || error,
      duration,
      timestamp: this.formatTimestamp(),
    };

    this.log('ERROR', '❌', `API ERROR`, errorData);
  }

  logDeviceValidation(machid: string, isValid: boolean, deviceInfo?: any, error?: string) {
    const validationData = {
      machid,
      isValid,
      deviceInfo,
      error,
      timestamp: this.formatTimestamp(),
    };

    const icon = isValid ? '✅' : '❌';
    const title = `DEVICE VALIDATION: ${machid}`;
    this.log(isValid ? 'SUCCESS' : 'ERROR', icon, title, validationData);
  }
}

export const apiLogger = new ApiLogger();