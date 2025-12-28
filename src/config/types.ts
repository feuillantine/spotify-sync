/**
 * アプリケーション設定の型定義
 */
export interface Config {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly playlistId: string;
}
