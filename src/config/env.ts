import dotenv from 'dotenv';
import { Config, ConfigValidationError } from './types';

dotenv.config();

export function loadEnvConfig(): Config {
  const requiredEnvVars = [
    'SOURCE_CLIENT_ID',
    'SOURCE_CLIENT_SECRET',
    'SOURCE_REFRESH_TOKEN',
    'TARGET_CLIENT_ID',
    'TARGET_CLIENT_SECRET',
    'TARGET_REFRESH_TOKEN',
    'TARGET_PLAYLIST_ID',
  ];

  const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    throw new ConfigValidationError(`必須の環境変数が設定されていません: ${missingEnvVars.join(', ')}`);
  }

  return {
    sourceClientId: process.env.SOURCE_CLIENT_ID as string,
    sourceClientSecret: process.env.SOURCE_CLIENT_SECRET as string,
    sourceRefreshToken: process.env.SOURCE_REFRESH_TOKEN as string,
    targetClientId: process.env.TARGET_CLIENT_ID as string,
    targetClientSecret: process.env.TARGET_CLIENT_SECRET as string,
    targetRefreshToken: process.env.TARGET_REFRESH_TOKEN as string,
    targetPlaylistId: process.env.TARGET_PLAYLIST_ID as string,
  };
}

// テスト用のモック設定を注入するための関数
let mockConfig: Config | null = null;

export function setMockConfig(config: Config): void {
  mockConfig = config;
}

export function clearMockConfig(): void {
  mockConfig = null;
}

// 実際の設定を取得する関数
export function getConfig(): Config {
  if (mockConfig) {
    return mockConfig;
  }
  return loadEnvConfig();
}

export { Config, ConfigValidationError };
export default getConfig;
