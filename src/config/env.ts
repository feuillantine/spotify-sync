import dotenv from 'dotenv';
import { Config } from './types';

dotenv.config();

export function loadEnvConfig(): Config {
  const requiredEnvVars = ['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN', 'PLAYLIST_ID'];

  const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    throw new Error(`必須の環境変数が設定されていません: ${missingEnvVars.join(', ')}`);
  }

  return {
    clientId: process.env.CLIENT_ID as string,
    clientSecret: process.env.CLIENT_SECRET as string,
    refreshToken: process.env.REFRESH_TOKEN as string,
    playlistId: process.env.PLAYLIST_ID as string,
  };
}

// 実際の設定を取得する関数
export function getConfig(): Config {
  return loadEnvConfig();
}

export { Config };
export default getConfig;
