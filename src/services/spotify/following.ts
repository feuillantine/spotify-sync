import type SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyApiError, withRetry } from '../../utils/error';
import { SpotifyAuth } from './auth';

export class SpotifyFollowing {
  private auth: SpotifyAuth;
  private static readonly CHUNK_SIZE = 50;

  constructor(private client: SpotifyWebApi) {
    this.auth = new SpotifyAuth(client);
  }

  /**
   * フォロー中のアーティストIDを取得
   */
  async getFollowedArtists(): Promise<string[]> {
    try {
      await this.auth.refreshToken();

      const ids: string[] = [];
      let after: string | null = null;

      do {
        const response = await withRetry(async () => {
          return await this.client.getFollowedArtists({
            limit: SpotifyFollowing.CHUNK_SIZE,
            after: after || undefined,
          });
        });

        const items = response.body.artists.items;
        ids.push(...items.map((item) => item.id));
        after = response.body.artists.cursors.after;
      } while (after);

      return ids;
    } catch (error) {
      if (error instanceof SpotifyApiError) {
        throw error;
      }
      if (error instanceof Error && 'statusCode' in error) {
        throw new SpotifyApiError('フォロー中アーティストの取得に失敗', (error as any).statusCode || 500, error);
      }
      throw new SpotifyApiError(
        'フォロー中アーティストの取得に失敗',
        500,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * 指定したアーティストをフォロー
   */
  async followArtists(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    try {
      await this.auth.refreshToken();

      for (let i = 0; i < ids.length; i += SpotifyFollowing.CHUNK_SIZE) {
        const chunk = ids.slice(i, i + SpotifyFollowing.CHUNK_SIZE);
        await withRetry(async () => {
          await this.client.followArtists(chunk);
        });
      }
    } catch (error) {
      if (error instanceof SpotifyApiError) {
        throw error;
      }
      if (error instanceof Error && 'statusCode' in error) {
        throw new SpotifyApiError('アーティストのフォローに失敗', (error as any).statusCode || 500, error);
      }
      throw new SpotifyApiError(
        'アーティストのフォローに失敗',
        500,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
