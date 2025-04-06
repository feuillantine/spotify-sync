import { type Config, ConfigValidationError, clearMockConfig, getConfig, loadEnvConfig, setMockConfig } from '../env';

describe('環境変数の設定管理', () => {
  beforeEach(() => {
    process.env = {};
    clearMockConfig();
  });

  describe('設定の読み込み', () => {
    test('環境変数から正しく設定を読み込む', () => {
      // 代表的な環境変数で検証
      process.env = {
        SOURCE_CLIENT_ID: 'source-id',
        SOURCE_CLIENT_SECRET: 'secret',
        SOURCE_REFRESH_TOKEN: 'token',
        TARGET_CLIENT_ID: 'target-id',
        TARGET_CLIENT_SECRET: 'secret',
        TARGET_REFRESH_TOKEN: 'token',
        TARGET_PLAYLIST_ID: 'playlist-id',
      };

      const config = loadEnvConfig();

      // 代表値のみ検証
      expect(config.sourceClientId).toBe('source-id');
      expect(config.targetPlaylistId).toBe('playlist-id');
    });

    test('必須の環境変数が欠けている場合はエラーを投げる', () => {
      process.env = {
        SOURCE_CLIENT_ID: 'id',
        // 他の値を意図的に除外
      };

      expect(() => loadEnvConfig()).toThrow(ConfigValidationError);
      expect(() => loadEnvConfig()).toThrow(/必須の環境変数が設定されていません/);
    });
  });

  describe('モック設定', () => {
    test('モック設定の切り替えが正しく動作する', () => {
      // 環境変数を設定
      process.env = {
        SOURCE_CLIENT_ID: 'env-id',
        SOURCE_CLIENT_SECRET: 'env-secret',
        SOURCE_REFRESH_TOKEN: 'env-token',
        TARGET_CLIENT_ID: 'env-target-id',
        TARGET_CLIENT_SECRET: 'env-secret',
        TARGET_REFRESH_TOKEN: 'env-token',
        TARGET_PLAYLIST_ID: 'env-playlist',
      };

      // モック設定を適用
      const mockConfig: Config = {
        sourceClientId: 'mock-id',
        sourceClientSecret: 'mock-secret',
        sourceRefreshToken: 'mock-token',
        targetClientId: 'mock-target-id',
        targetClientSecret: 'mock-secret',
        targetRefreshToken: 'mock-token',
        targetPlaylistId: 'mock-playlist',
      };
      setMockConfig(mockConfig);

      // モック値が使われることを確認
      expect(getConfig().sourceClientId).toBe('mock-id');
      expect(getConfig().targetPlaylistId).toBe('mock-playlist');

      // モック解除で環境変数に戻ることを確認
      clearMockConfig();
      expect(getConfig().sourceClientId).toBe('env-id');
      expect(getConfig().targetPlaylistId).toBe('env-playlist');
    });
  });
});
