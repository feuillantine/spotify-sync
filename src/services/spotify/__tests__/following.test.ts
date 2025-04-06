import type SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyApiError } from '../../../utils/error';
import { SpotifyFollowing } from '../following';

describe('SpotifyFollowing', () => {
  let mockSpotifyApi: jest.Mocked<SpotifyWebApi>;
  let following: SpotifyFollowing;

  beforeEach(() => {
    mockSpotifyApi = {
      getFollowedArtists: jest.fn(),
      followArtists: jest.fn(),
      refreshAccessToken: jest.fn().mockResolvedValue({
        body: { access_token: 'mock-access-token' },
      }),
      setAccessToken: jest.fn(),
    } as any;

    following = new SpotifyFollowing(mockSpotifyApi);
  });

  describe('getFollowedArtists', () => {
    it('フォロー中のアーティスト一覧を取得', async () => {
      const mockResponse = {
        body: {
          artists: {
            href: 'https://api.spotify.com/v1/me/following?type=artist',
            items: [
              {
                id: 'artist1',
                type: 'artist' as const,
                uri: 'spotify:artist:artist1',
                followers: { href: null, total: 100 },
                genres: ['rock'],
                images: [{ url: 'image1.jpg', height: 300, width: 300 }],
                name: 'Artist 1',
                popularity: 80,
                external_urls: { spotify: 'https://open.spotify.com/artist/artist1' },
                href: 'https://api.spotify.com/v1/artists/artist1',
              },
              {
                id: 'artist2',
                type: 'artist' as const,
                uri: 'spotify:artist:artist2',
                followers: { href: null, total: 200 },
                genres: ['pop'],
                images: [{ url: 'image2.jpg', height: 300, width: 300 }],
                name: 'Artist 2',
                popularity: 90,
                external_urls: { spotify: 'https://open.spotify.com/artist/artist2' },
                href: 'https://api.spotify.com/v1/artists/artist2',
              },
            ],
            limit: 50,
            next: null,
            cursors: { after: '' },
            total: 2,
          },
        },
        headers: {},
        statusCode: 200,
      };

      mockSpotifyApi.getFollowedArtists.mockResolvedValueOnce(mockResponse);

      const result = await following.getFollowedArtists();
      expect(result).toEqual(['artist1', 'artist2']);
      expect(mockSpotifyApi.refreshAccessToken).toHaveBeenCalled();
      expect(mockSpotifyApi.setAccessToken).toHaveBeenCalledWith('mock-access-token');
    });

    it('ページネーション処理の確認', async () => {
      const mockResponse1 = {
        body: {
          artists: {
            href: 'https://api.spotify.com/v1/me/following?type=artist',
            items: [
              {
                id: 'artist1',
                type: 'artist' as const,
                uri: 'spotify:artist:artist1',
                followers: { href: null, total: 100 },
                genres: ['rock'],
                images: [{ url: 'image1.jpg', height: 300, width: 300 }],
                name: 'Artist 1',
                popularity: 80,
                external_urls: { spotify: 'https://open.spotify.com/artist/artist1' },
                href: 'https://api.spotify.com/v1/artists/artist1',
              },
            ],
            limit: 50,
            next: 'https://api.spotify.com/v1/me/following?type=artist&after=next',
            cursors: { after: 'next' },
            total: 2,
          },
        },
        headers: {},
        statusCode: 200,
      };

      const mockResponse2 = {
        body: {
          artists: {
            href: 'https://api.spotify.com/v1/me/following?type=artist',
            items: [
              {
                id: 'artist2',
                type: 'artist' as const,
                uri: 'spotify:artist:artist2',
                followers: { href: null, total: 200 },
                genres: ['pop'],
                images: [{ url: 'image2.jpg', height: 300, width: 300 }],
                name: 'Artist 2',
                popularity: 90,
                external_urls: { spotify: 'https://open.spotify.com/artist/artist2' },
                href: 'https://api.spotify.com/v1/artists/artist2',
              },
            ],
            limit: 50,
            next: null,
            cursors: { after: '' },
            total: 2,
          },
        },
        headers: {},
        statusCode: 200,
      };

      mockSpotifyApi.getFollowedArtists.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const result = await following.getFollowedArtists();
      expect(result).toEqual(['artist1', 'artist2']);
      expect(mockSpotifyApi.refreshAccessToken).toHaveBeenCalled();
      expect(mockSpotifyApi.setAccessToken).toHaveBeenCalledWith('mock-access-token');
    });

    it('一時的なエラー時にリトライして成功', async () => {
      const error = new SpotifyApiError('Service Unavailable', 503);
      mockSpotifyApi.getFollowedArtists.mockRejectedValueOnce(error).mockResolvedValueOnce({
        body: {
          artists: {
            items: [
              {
                id: 'artist1',
                type: 'artist',
                uri: 'spotify:artist:artist1',
                href: 'https://api.spotify.com/v1/artists/artist1',
                name: 'Artist 1',
                popularity: 0,
                genres: [],
                followers: { href: null, total: 0 },
                images: [],
                external_urls: { spotify: '' },
              },
            ],
            cursors: { after: '' },
            href: 'https://api.spotify.com/v1/me/following',
            limit: 20,
            next: null,
            total: 1,
          },
        },
        headers: {},
        statusCode: 200,
      });

      const result = await following.getFollowedArtists();
      expect(result).toEqual(['artist1']);
      expect(mockSpotifyApi.getFollowedArtists).toHaveBeenCalledTimes(2);
    });

    it('APIエラー時に適切なエラーをスロー', async () => {
      mockSpotifyApi.getFollowedArtists.mockRejectedValueOnce(new SpotifyApiError('Unauthorized', 401));

      await expect(following.getFollowedArtists()).rejects.toThrow(SpotifyApiError);
    });

    it('不明なエラー時に500エラーをスロー', async () => {
      mockSpotifyApi.getFollowedArtists.mockRejectedValueOnce(new Error('Unknown error'));

      const promise = following.getFollowedArtists();
      await expect(promise).rejects.toThrow(SpotifyApiError);
      await expect(promise).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe('followArtists', () => {
    it('アーティストをフォロー', async () => {
      await following.followArtists(['artist1', 'artist2']);
      expect(mockSpotifyApi.followArtists).toHaveBeenCalledWith(['artist1', 'artist2']);
      expect(mockSpotifyApi.refreshAccessToken).toHaveBeenCalled();
      expect(mockSpotifyApi.setAccessToken).toHaveBeenCalledWith('mock-access-token');
    });

    it('空の配列の場合は何もしない', async () => {
      await following.followArtists([]);
      expect(mockSpotifyApi.followArtists).not.toHaveBeenCalled();
      expect(mockSpotifyApi.refreshAccessToken).not.toHaveBeenCalled();
      expect(mockSpotifyApi.setAccessToken).not.toHaveBeenCalled();
    });

    it('エラー時にSpotifyApiErrorをスロー', async () => {
      const error = new Error('API Error');
      mockSpotifyApi.followArtists.mockRejectedValueOnce(error);

      await expect(following.followArtists(['artist1'])).rejects.toThrow(SpotifyApiError);
    });

    it('一時的なエラー時にリトライして成功', async () => {
      const error = new SpotifyApiError('Service Unavailable', 503);
      mockSpotifyApi.followArtists.mockRejectedValueOnce(error).mockResolvedValueOnce({
        body: undefined,
        headers: {},
        statusCode: 204,
      });

      await following.followArtists(['artist1']);
      expect(mockSpotifyApi.followArtists).toHaveBeenCalledTimes(2);
    });

    it('APIエラー時に適切なエラーをスロー', async () => {
      const error = new SpotifyApiError('Forbidden', 403);
      mockSpotifyApi.followArtists.mockRejectedValue(error);

      const promise = following.followArtists(['artist1']);
      await expect(promise).rejects.toThrow(SpotifyApiError);
    });
  });
});
