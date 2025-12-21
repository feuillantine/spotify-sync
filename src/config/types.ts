/**
 * アプリケーション設定の型定義
 */
export interface Config {
  readonly sourceClientId: string;
  readonly sourceClientSecret: string;
  readonly sourceRefreshToken: string;
  readonly targetClientId: string;
  readonly targetClientSecret: string;
  readonly targetRefreshToken: string;
  readonly targetPlaylistId: string;
}
