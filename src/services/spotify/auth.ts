import SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyApiError, withRetry } from '../../utils/error';
import type { SpotifyAuthServiceInterface } from './types';

// 必要なスコープを定義
export const REQUIRED_SCOPES = [
  'user-library-read',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-follow-read',
  'user-follow-modify',
];

export class SpotifyAuth implements SpotifyAuthServiceInterface {
  constructor(private client: SpotifyWebApi) {}

  async refreshToken(): Promise<void> {
    try {
      await withRetry(async () => {
        const data = await this.client.refreshAccessToken();
        this.client.setAccessToken(data.body.access_token);
      });
    } catch (error) {
      if (error instanceof SpotifyApiError) {
        throw error;
      }
      if (error instanceof Error && 'statusCode' in error) {
        throw new SpotifyApiError('Failed to refresh access token', (error as any).statusCode || 500, error);
      }
      throw new SpotifyApiError(
        'Failed to refresh access token',
        500,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * 認証済みSpotifyクライアントを生成
   */
  static createClient(clientId: string, clientSecret: string, refreshToken: string): SpotifyWebApi {
    return new SpotifyWebApi({
      clientId,
      clientSecret,
      refreshToken,
    });
  }

  /**
   * 認証用URLを生成
   */
  static createAuthUrl(clientId: string, redirectUri: string): string {
    const spotifyApi = new SpotifyWebApi({
      clientId,
      redirectUri,
    });
    return spotifyApi.createAuthorizeURL(REQUIRED_SCOPES, '');
  }
}
