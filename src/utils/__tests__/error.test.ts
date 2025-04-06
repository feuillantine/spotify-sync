import {
  AuthenticationError,
  ConfigError,
  ErrorType,
  FollowingError,
  PlaylistError,
  SpotifyApiError,
  TrackError,
  formatErrorMessage,
  handleError,
  withRetry,
} from '../error';

describe('エラークラス', () => {
  test('SpotifyApiError が正しく初期化される', () => {
    const cause = new Error('Original error');
    const error = new SpotifyApiError('Test error', 404, cause);

    expect(error.message).toBe('[SPOTIFY_API] Test error - {"statusCode":404}');
    expect(error.name).toBe('SpotifyApiError');
    expect(error.statusCode).toBe(404);
    expect(error.cause).toBe(cause);
  });

  test('ConfigError が正しく初期化される', () => {
    const error = new ConfigError('Test error');

    expect(error.message).toBe('[CONFIG] Test error');
    expect(error.name).toBe('ConfigError');
  });

  test('AuthenticationError が正しく初期化される', () => {
    const cause = new Error('Original error');
    const error = new AuthenticationError('認証エラー', cause);

    expect(error.message).toContain('[AUTHENTICATION]');
    expect(error.message).toContain('認証エラー');
    expect(error.name).toBe('AuthenticationError');
    expect(error.cause).toBe(cause);
  });

  test('PlaylistError が正しく初期化される', () => {
    const cause = new Error('Original error');
    const details = { playlistId: '123' };
    const error = new PlaylistError('プレイリストエラー', details, cause);

    expect(error.message).toContain('[PLAYLIST]');
    expect(error.message).toContain('プレイリストエラー');
    expect(error.message).toContain('"playlistId":"123"');
    expect(error.name).toBe('PlaylistError');
    expect(error.cause).toBe(cause);
  });

  test('TrackError が正しく初期化される', () => {
    const cause = new Error('Original error');
    const details = { trackId: '456' };
    const error = new TrackError('トラックエラー', details, cause);

    expect(error.message).toContain('[TRACK]');
    expect(error.message).toContain('トラックエラー');
    expect(error.message).toContain('"trackId":"456"');
    expect(error.name).toBe('TrackError');
    expect(error.cause).toBe(cause);
  });

  test('FollowingError が正しく初期化される', () => {
    const cause = new Error('Original error');
    const details = { type: 'artist' };
    const error = new FollowingError('フォローエラー', details, cause);

    expect(error.message).toContain('[FOLLOWING]');
    expect(error.message).toContain('フォローエラー');
    expect(error.message).toContain('"type":"artist"');
    expect(error.name).toBe('FollowingError');
    expect(error.cause).toBe(cause);
  });
});

describe('formatErrorMessage', () => {
  test('メッセージのみの場合', () => {
    const message = formatErrorMessage(ErrorType.CONFIG, 'テストエラー');
    expect(message).toBe('[CONFIG] テストエラー');
  });

  test('詳細情報付きの場合', () => {
    const message = formatErrorMessage(ErrorType.PLAYLIST, 'テストエラー', { id: '123' });
    expect(message).toBe('[PLAYLIST] テストエラー - {"id":"123"}');
  });

  test('詳細情報が空オブジェクトの場合', () => {
    const message = formatErrorMessage(ErrorType.TRACK, 'テストエラー', {});
    expect(message).toBe('[TRACK] テストエラー - {}');
  });

  test('詳細情報にネストされたオブジェクトがある場合', () => {
    const message = formatErrorMessage(ErrorType.FOLLOWING, 'テストエラー', {
      user: { id: '123', name: 'test' },
    });
    expect(message).toBe('[FOLLOWING] テストエラー - {"user":{"id":"123","name":"test"}}');
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('成功時は即座に結果を返す', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('一時的なエラー後にリトライして成功する', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new SpotifyApiError('Temporary error', 429))
      .mockResolvedValueOnce('success');

    const resultPromise = withRetry(fn);

    // 1回目の失敗
    await Promise.resolve();
    // タイマーを進める
    jest.advanceTimersByTime(1000);
    // タイマーの解決を待つ
    await Promise.resolve();

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  }, 10000);

  test('最大リトライ回数を超えた場合はエラーを投げる', async () => {
    const error = new SpotifyApiError('Persistent error', 429);
    const fn = jest.fn().mockRejectedValue(error);

    const resultPromise = withRetry(fn, { maxRetries: 2 });

    // 1回目の失敗
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // 2回目の失敗
    await Promise.resolve();
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    await expect(resultPromise).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(2);
  }, 10000);

  test('リトライ不可能なエラーは即座にスローされる', async () => {
    const error = new ConfigError('Config error');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetry(fn)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('カスタムリトライオプションが正しく適用される', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new SpotifyApiError('Temporary error', 429))
      .mockResolvedValueOnce('success');

    const resultPromise = withRetry(fn, {
      maxRetries: 2,
      initialDelay: 500,
      backoffFactor: 3,
      retryableErrors: [SpotifyApiError],
    });

    // 1回目の失敗
    await Promise.resolve();
    jest.advanceTimersByTime(500);
    await Promise.resolve();

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  }, 10000);

  test('エラーなしでリトライが失敗した場合は適切なエラーを投げる', async () => {
    const fn = jest.fn().mockImplementation(async () => {
      const error = new Error();
      error.name = '';
      error.message = '';
      throw error;
    });

    const resultPromise = withRetry(fn, { maxRetries: 1 });

    // 1回目の失敗
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    await expect(resultPromise).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  }, 10000);

  test('複数の異なるタイプのエラーが発生した場合も適切にリトライする', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new SpotifyApiError('API error', 429))
      .mockRejectedValueOnce(new SpotifyApiError('API error 2', 429))
      .mockResolvedValueOnce('success');

    const resultPromise = withRetry(fn, {
      retryableErrors: [SpotifyApiError],
      maxRetries: 3,
      initialDelay: 1000,
    });

    // 1回目の失敗（SpotifyApiError）
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // 2回目の失敗（SpotifyApiError）
    await Promise.resolve();
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    // 最終的な成功
    await Promise.resolve();

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  }, 10000);
});

describe('handleError', () => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => void 0);
  const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => void 0);

  beforeEach(() => {
    mockExit.mockClear();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
  });

  afterAll(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  test('重大なSpotifyApiErrorはerrorレベルで出力', () => {
    const error = new SpotifyApiError('API error', 500);
    handleError(error);

    expect(mockConsoleError).toHaveBeenCalledWith({
      message: error.message,
      type: 'SpotifyApiError',
      statusCode: 500,
      stack: error.stack,
    });
    expect(mockConsoleWarn).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('軽微なSpotifyApiErrorはwarnレベルで出力', () => {
    const error = new SpotifyApiError('API error', 429);
    handleError(error);

    expect(mockConsoleWarn).toHaveBeenCalledWith({
      message: error.message,
      type: 'SpotifyApiError',
      statusCode: 429,
      stack: error.stack,
    });
    expect(mockConsoleError).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('ConfigErrorはerrorレベルで出力', () => {
    const error = new ConfigError('Config error');
    handleError(error);

    expect(mockConsoleError).toHaveBeenCalledWith({
      message: error.message,
      type: 'ConfigError',
      stack: error.stack,
    });
    expect(mockConsoleWarn).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('予期しないエラーはwarnレベルで出力', () => {
    const error = new Error('Unexpected error');
    handleError(error);

    expect(mockConsoleWarn).toHaveBeenCalledWith({
      message: error.message,
      type: 'Error',
      stack: error.stack,
    });
    expect(mockConsoleError).not.toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
