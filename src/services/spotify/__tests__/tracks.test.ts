import type SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyTracks } from '../tracks';

jest.mock('spotify-web-api-node');

describe('SpotifyTracks', () => {
  let trackService: SpotifyTracks;
  let mockSpotifyApi: jest.Mocked<SpotifyWebApi>;

  const mockSpotifyTrack: SpotifyApi.TrackObjectFull = {
    id: 'test-id',
    name: 'Test Track',
    artists: [
      {
        id: 'artist-id',
        name: 'Test Artist',
        uri: 'spotify:artist:test',
        type: 'artist',
        href: 'https://api.spotify.com/v1/artists/test',
        external_urls: {
          spotify: 'https://open.spotify.com/artist/test',
        },
      },
    ],
    uri: 'spotify:track:test',
    album: {
      id: 'album-id',
      name: 'Test Album',
      release_date: '2024-03-31',
      images: [
        {
          url: 'https://example.com/image.jpg',
          height: 300,
          width: 300,
        },
      ],
      album_type: 'album',
      artists: [
        {
          id: 'artist-id',
          name: 'Test Artist',
          uri: 'spotify:artist:test',
          type: 'artist',
          href: 'https://api.spotify.com/v1/artists/test',
          external_urls: {
            spotify: 'https://open.spotify.com/artist/test',
          },
        },
      ],
      release_date_precision: 'day',
      total_tracks: 12,
      type: 'album',
      uri: 'spotify:album:test',
      href: 'https://api.spotify.com/v1/albums/test',
      external_urls: {
        spotify: 'https://open.spotify.com/album/test',
      },
    },
    popularity: 80,
    type: 'track',
    href: 'https://api.spotify.com/v1/tracks/test',
    external_ids: { isrc: 'USRC12345678' },
    disc_number: 1,
    duration_ms: 180000,
    explicit: false,
    external_urls: {
      spotify: 'https://open.spotify.com/track/test',
    },
    is_local: false,
    is_playable: true,
    track_number: 1,
    preview_url: 'https://preview.spotify.com/test',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    mockSpotifyApi = {
      setAccessToken: jest.fn(),
      refreshAccessToken: jest.fn().mockResolvedValue({
        body: {
          access_token: 'mock-access-token',
          expires_in: 3600,
        },
      }),
      getMySavedTracks: jest.fn().mockResolvedValue({
        body: {
          items: [
            {
              track: mockSpotifyTrack,
              added_at: '2024-03-31T00:00:00Z',
            },
          ],
          total: 1,
          limit: 50,
          offset: 0,
          href: 'https://api.spotify.com/v1/me/tracks',
          next: null,
          previous: null,
        },
        headers: {},
        statusCode: 200,
      }),
    } as unknown as jest.Mocked<SpotifyWebApi>;

    trackService = new SpotifyTracks(mockSpotifyApi);
  });

  describe('getSavedTracks', () => {
    test('保存済みトラックが正常に取得できること', async () => {
      const tracks = await trackService.getSavedTracks();
      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe(mockSpotifyTrack.id);
      expect(mockSpotifyApi.getMySavedTracks).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
      });
    });

    test('エラー時に適切に例外がスローされること（statusCodeあり）', async () => {
      const error = new Error('API error');
      (error as any).statusCode = 401;
      mockSpotifyApi.getMySavedTracks.mockRejectedValueOnce(error);

      await expect(trackService.getSavedTracks()).rejects.toThrow('Failed to fetch saved tracks');
    });

    test('エラー時に適切に例外がスローされること（statusCodeなし）', async () => {
      const error = new Error('Network error');
      mockSpotifyApi.getMySavedTracks.mockRejectedValueOnce(error);

      await expect(trackService.getSavedTracks()).rejects.toThrow('Failed to fetch saved tracks');
    });
  });

  describe('getTracksWithFilter', () => {
    beforeEach(() => {
      mockSpotifyApi.getMySavedTracks.mockResolvedValue({
        body: {
          items: [
            {
              track: {
                ...mockSpotifyTrack,
                id: 'test-id-1',
                popularity: 80,
                artists: [
                  {
                    id: 'artist-id-1',
                    name: 'Test Artist',
                    uri: 'spotify:artist:test1',
                    type: 'artist',
                    href: 'https://api.spotify.com/v1/artists/test1',
                    external_urls: {
                      spotify: 'https://open.spotify.com/artist/test1',
                    },
                  },
                ],
              },
              added_at: '2024-03-31T00:00:00Z',
            },
            {
              track: {
                ...mockSpotifyTrack,
                id: 'test-id-2',
                popularity: 40,
                artists: [
                  {
                    id: 'artist-id-2',
                    name: 'Another Artist',
                    uri: 'spotify:artist:test2',
                    type: 'artist',
                    href: 'https://api.spotify.com/v1/artists/test2',
                    external_urls: {
                      spotify: 'https://open.spotify.com/artist/test2',
                    },
                  },
                ],
              },
              added_at: '2024-03-31T00:00:00Z',
            },
            {
              track: {
                ...mockSpotifyTrack,
                id: 'test-id-3',
                popularity: 60,
                artists: [
                  {
                    id: 'artist-id-3',
                    name: 'Third Artist',
                    uri: 'spotify:artist:test3',
                    type: 'artist',
                    href: 'https://api.spotify.com/v1/artists/test3',
                    external_urls: {
                      spotify: 'https://open.spotify.com/artist/test3',
                    },
                  },
                ],
              },
              added_at: '2024-03-29T00:00:00Z',
            },
            {
              track: {
                ...mockSpotifyTrack,
                id: 'test-id-4',
                popularity: 70,
                artists: [
                  {
                    id: 'artist-id-4',
                    name: 'Fourth Artist',
                    uri: 'spotify:artist:test4',
                    type: 'artist',
                    href: 'https://api.spotify.com/v1/artists/test4',
                    external_urls: {
                      spotify: 'https://open.spotify.com/artist/test4',
                    },
                  },
                ],
              },
              added_at: '2024-04-01T00:00:00Z',
            },
          ],
          total: 4,
          limit: 50,
          offset: 0,
          href: 'https://api.spotify.com/v1/me/tracks',
          next: null,
          previous: null,
        },
        headers: {},
        statusCode: 200,
      });
    });

    test('人気度でフィルタリングできること', async () => {
      const filter = {
        minPopularity: 75,
      };

      const tracks = await trackService.getTracksWithFilter(filter);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].popularity).toBe(80);
    });

    test('アーティストでフィルタリングできること', async () => {
      const filter = {
        artists: ['Test Artist'],
      };

      const tracks = await trackService.getTracksWithFilter(filter);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].artists[0].name).toBe('Test Artist');
    });

    test('日付でフィルタリングできること（after）', async () => {
      const filter = {
        after: new Date('2024-03-30'),
      };

      const tracks = await trackService.getTracksWithFilter(filter);
      expect(tracks).toHaveLength(3);
      expect(tracks.every((track) => new Date(track.added_at) >= filter.after)).toBe(true);
    });

    test('日付でフィルタリングできること（before）', async () => {
      const filter = {
        before: new Date('2024-03-30'),
      };

      const tracks = await trackService.getTracksWithFilter(filter);
      expect(tracks).toHaveLength(1);
      expect(tracks.every((track) => new Date(track.added_at) <= filter.before)).toBe(true);
    });

    test('最大人気度でフィルタリングできること', async () => {
      const filter = {
        maxPopularity: 50,
      };

      const tracks = await trackService.getTracksWithFilter(filter);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].popularity).toBe(40);
    });

    test('複数のフィルタを組み合わせてフィルタリングできること', async () => {
      const filter = {
        artists: ['Test Artist'],
        after: new Date('2024-03-30'),
        before: new Date('2024-04-01'),
      };

      const tracks = await trackService.getTracksWithFilter(filter);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].artists[0].name).toBe('Test Artist');
    });

    test('アーティスト名の大文字小文字を区別せずにフィルタリングできること', async () => {
      const filter = {
        artists: ['test artist'],
      };

      const tracks = await trackService.getTracksWithFilter(filter);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].artists[0].name.toLowerCase()).toBe('test artist');
    });
  });
});
