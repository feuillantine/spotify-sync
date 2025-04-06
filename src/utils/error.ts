export enum ErrorType {
  SPOTIFY_API = 'SPOTIFY_API',
  CONFIG = 'CONFIG',
  AUTHENTICATION = 'AUTHENTICATION',
  PLAYLIST = 'PLAYLIST',
  TRACK = 'TRACK',
  FOLLOWING = 'FOLLOWING',
}

export class BaseError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export function formatErrorMessage(type: ErrorType, message: string, details?: Record<string, unknown>): string {
  const formattedDetails = details ? ` - ${JSON.stringify(details)}` : '';
  return `[${type}] ${message}${formattedDetails}`;
}

export class SpotifyApiError extends BaseError {
  constructor(
    message: string,
    public statusCode: number,
    cause?: Error,
  ) {
    super(formatErrorMessage(ErrorType.SPOTIFY_API, message, { statusCode }), ErrorType.SPOTIFY_API, cause);
  }
}

export class ConfigError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(formatErrorMessage(ErrorType.CONFIG, message), ErrorType.CONFIG, cause);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(formatErrorMessage(ErrorType.AUTHENTICATION, message), ErrorType.AUTHENTICATION, cause);
  }
}

export class PlaylistError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(formatErrorMessage(ErrorType.PLAYLIST, message, details), ErrorType.PLAYLIST, cause);
  }
}

export class TrackError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(formatErrorMessage(ErrorType.TRACK, message, details), ErrorType.TRACK, cause);
  }
}

export class FollowingError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super(formatErrorMessage(ErrorType.FOLLOWING, message, details), ErrorType.FOLLOWING, cause);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
    retryableErrors?: Array<new (...args: any[]) => Error>;
    onRetry?: (error: Error, attempt: number) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffFactor = 2,
    retryableErrors = [SpotifyApiError],
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (retryableErrors.length > 0 && !retryableErrors.some((ErrorType) => error instanceof ErrorType)) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * backoffFactor ** attempt;
        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (!lastError) {
    throw new Error('Retry failed with no error');
  }
  throw lastError;
}

export function handleError(error: Error): never {
  const logData = {
    message: error.message,
    type: error.constructor.name,
    ...(error instanceof SpotifyApiError ? { statusCode: error.statusCode } : {}),
    stack: error.stack,
  };

  if ((error instanceof SpotifyApiError && error.statusCode >= 500) || error instanceof ConfigError) {
    console.error(logData);
  } else {
    console.warn(logData);
  }
  process.exit(1);
}

export function isRetryableError(error: Error): boolean {
  return error instanceof SpotifyApiError && error.statusCode >= 500;
}
