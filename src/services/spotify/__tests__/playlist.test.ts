import type SpotifyWebApi from 'spotify-web-api-node';
import { PlaylistError, SpotifyApiError } from '../../../utils/error';
import { SpotifyPlaylist } from '../playlist';
import type { Track } from '../types';

jest.mock('spotify-web-api-node');

describe('SpotifyPlaylist', () => {
  let playlistService: SpotifyPlaylist;
  let mockSpotifyApi: jest.Mocked<SpotifyWebApi>;

  const mockSpotifyTrack = {
    id: 'test-id',
    name: 'Test Track',
    artists: [
      {
        id: 'artist-id',
        name: 'Test Artist',
        uri: 'spotify:artist:test',
        type: 'artist' as const,
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
      album_type: 'album' as const,
      artists: [
        {
          id: 'artist-id',
          name: 'Test Artist',
          uri: 'spotify:artist:test',
          type: 'artist' as const,
          href: 'https://api.spotify.com/v1/artists/test',
          external_urls: {
            spotify: 'https://open.spotify.com/artist/test',
          },
        },
      ],
      release_date_precision: 'day' as const,
      total_tracks: 12,
      type: 'album' as const,
      uri: 'spotify:album:test',
      href: 'https://api.spotify.com/v1/albums/test',
      external_urls: {
        spotify: 'https://open.spotify.com/album/test',
      },
    },
    popularity: 80,
    type: 'track' as const,
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

  const mockPlaylistTrack = {
    track: mockSpotifyTrack,
    added_at: '2024-03-31T00:00:00Z',
    added_by: {
      id: 'user-id',
      type: 'user' as const,
      uri: 'spotify:user:test',
      href: 'https://api.spotify.com/v1/users/test',
      external_urls: {
        spotify: 'https://open.spotify.com/user/test',
      },
    },
    is_local: false,
  } as const;

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
      getMe: jest.fn().mockResolvedValue({}),
      createPlaylist: jest.fn().mockResolvedValue({
        body: { id: 'playlist-id' },
      }),
      addTracksToPlaylist: jest.fn().mockResolvedValue({}),
      removeTracksFromPlaylist: jest.fn().mockResolvedValue({}),
      getPlaylistTracks: jest.fn().mockResolvedValue({
        body: {
          items: [mockPlaylistTrack],
          total: 1,
          limit: 50,
          offset: 0,
          href: 'https://api.spotify.com/v1/playlists/playlist-id/tracks',
          next: null,
          previous: null,
        },
        headers: {},
        statusCode: 200,
      }),
    } as unknown as jest.Mocked<SpotifyWebApi>;

    playlistService = new SpotifyPlaylist(mockSpotifyApi);
  });

  describe('createPlaylist', () => {
    test('プレイリストが正常に作成できること', async () => {
      const playlistId = await playlistService.createPlaylist('Test Playlist', 'Test Description');
      expect(playlistId).toBe('playlist-id');
      expect(mockSpotifyApi.createPlaylist).toHaveBeenCalledWith('Test Playlist', {
        description: 'Test Description',
        public: false,
      });
    });

    test('エラー時に適切に例外がスローされること', async () => {
      const error = new Error('API error');
      (error as any).statusCode = 401;
      mockSpotifyApi.createPlaylist.mockRejectedValueOnce(error);

      await expect(playlistService.createPlaylist('Test Playlist')).rejects.toThrow('Failed to create playlist');
    });

    test('getMeがエラーの場合、プレイリスト作成に失敗すること', async () => {
      const error = new Error('API error');
      (error as any).statusCode = 401;
      mockSpotifyApi.getMe.mockRejectedValueOnce(error);

      await expect(playlistService.createPlaylist('Test Playlist')).rejects.toThrow('Failed to create playlist');
      expect(mockSpotifyApi.createPlaylist).not.toHaveBeenCalled();
    });

    it('プレイリスト作成時にgetMeがエラーの場合、エラーをスロー', async () => {
      mockSpotifyApi.getMe.mockRejectedValueOnce({
        statusCode: 401,
        message: 'Unauthorized',
      });

      await expect(playlistService.createPlaylist('test')).rejects.toThrow(PlaylistError);
      expect(mockSpotifyApi.createPlaylist).not.toHaveBeenCalled();
    });

    it('プレイリスト作成時にstatusCodeを持つエラーの場合、PlaylistErrorをスロー', async () => {
      mockSpotifyApi.getMe.mockResolvedValueOnce({
        body: {
          id: 'user1',
          birthdate: '1990-01-01',
          country: 'JP',
          email: 'test@example.com',
          product: 'premium',
          display_name: 'Test User',
          external_urls: { spotify: '' },
          followers: { href: null, total: 0 },
          href: '',
          images: [],
          type: 'user',
          uri: '',
        },
        headers: {},
        statusCode: 200,
      });
      mockSpotifyApi.createPlaylist.mockRejectedValueOnce({
        statusCode: 403,
        message: 'Forbidden',
      });

      await expect(playlistService.createPlaylist('test')).rejects.toThrow(PlaylistError);
    });
  });

  describe('addTracks', () => {
    const trackToAdd: Track = {
      id: mockSpotifyTrack.id,
      name: mockSpotifyTrack.name,
      artists: mockSpotifyTrack.artists.map((a) => ({
        id: a.id,
        name: a.name,
        uri: a.uri,
      })),
      uri: mockSpotifyTrack.uri,
      added_at: mockPlaylistTrack.added_at,
      album: {
        id: mockSpotifyTrack.album.id,
        name: mockSpotifyTrack.album.name,
        release_date: mockSpotifyTrack.album.release_date,
        images: mockSpotifyTrack.album.images,
      },
      popularity: mockSpotifyTrack.popularity,
    };

    test('トラックが正常に追加できること', async () => {
      await playlistService.addTracks('playlist-id', [trackToAdd]);
      expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenCalledWith('playlist-id', [trackToAdd.uri]);
    });

    test('トラックが空の場合は何もしないこと', async () => {
      await playlistService.addTracks('playlist-id', []);
      expect(mockSpotifyApi.addTracksToPlaylist).not.toHaveBeenCalled();
    });

    test('100曲以上のトラックを分割して追加できること', async () => {
      const tracks = Array(150).fill(trackToAdd);
      await playlistService.addTracks('playlist-id', tracks);
      expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenCalledTimes(2);
    });

    test('エラー時に適切に例外がスローされること', async () => {
      const error = new Error('API error');
      (error as any).statusCode = 401;
      mockSpotifyApi.addTracksToPlaylist.mockRejectedValueOnce(error);

      await expect(playlistService.addTracks('playlist-id', [trackToAdd])).rejects.toThrow(
        'Failed to add tracks to playlist',
      );
    });

    test('100曲の制限値でトラックを追加できること', async () => {
      const tracks = Array(100).fill(trackToAdd);
      await playlistService.addTracks('playlist-id', tracks);
      expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenCalledTimes(1);
      expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenCalledWith(
        'playlist-id',
        tracks.map((t) => t.uri),
      );
    });

    test('101曲のトラックを2回に分けて追加できること', async () => {
      const tracks = Array(101).fill(trackToAdd);
      await playlistService.addTracks('playlist-id', tracks);
      expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenCalledTimes(2);
      expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenNthCalledWith(
        1,
        'playlist-id',
        tracks.slice(0, 100).map((t) => t.uri),
      );
      expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenNthCalledWith(
        2,
        'playlist-id',
        tracks.slice(100).map((t) => t.uri),
      );
    });

    test('一部のチャンクでエラーが発生した場合、処理を中断すること', async () => {
      const tracks = Array(150).fill(trackToAdd);
      const error = new Error('API error');
      (error as any).statusCode = 401;
      mockSpotifyApi.addTracksToPlaylist
        .mockResolvedValueOnce({
          body: { snapshot_id: 'snapshot1' },
          headers: {},
          statusCode: 201,
        })
        .mockRejectedValueOnce(error);

      await expect(playlistService.addTracks('playlist-id', tracks)).rejects.toThrow(
        'Failed to add tracks to playlist',
      );
      expect(mockSpotifyApi.addTracksToPlaylist).toHaveBeenCalledTimes(2);
    });

    it('トラック追加時にstatusCodeを持つエラーの場合、PlaylistErrorをスロー', async () => {
      mockSpotifyApi.addTracksToPlaylist.mockRejectedValueOnce({
        statusCode: 403,
        message: 'Forbidden',
      });

      await expect(playlistService.addTracks('playlist-id', [trackToAdd])).rejects.toThrow(PlaylistError);
    });

    it('トラック追加時にSpotifyApiErrorの場合、PlaylistErrorをスロー', async () => {
      const error = new SpotifyApiError('API Error', 403);
      mockSpotifyApi.addTracksToPlaylist.mockRejectedValue(error);

      await expect(playlistService.addTracks('playlist-id', [trackToAdd])).rejects.toThrow(PlaylistError);
    });
  });

  describe('removeTracks', () => {
    const trackToRemove: Track = {
      id: mockSpotifyTrack.id,
      name: mockSpotifyTrack.name,
      artists: mockSpotifyTrack.artists.map((a) => ({
        id: a.id,
        name: a.name,
        uri: a.uri,
      })),
      uri: mockSpotifyTrack.uri,
      added_at: mockPlaylistTrack.added_at,
      album: {
        id: mockSpotifyTrack.album.id,
        name: mockSpotifyTrack.album.name,
        release_date: mockSpotifyTrack.album.release_date,
        images: mockSpotifyTrack.album.images,
      },
      popularity: mockSpotifyTrack.popularity,
    };

    test('トラックが正常に削除できること', async () => {
      await playlistService.removeTracks('playlist-id', [trackToRemove]);
      expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenCalledWith('playlist-id', [{ uri: trackToRemove.uri }]);
    });

    test('トラックが空の場合は何もしないこと', async () => {
      await playlistService.removeTracks('playlist-id', []);
      expect(mockSpotifyApi.removeTracksFromPlaylist).not.toHaveBeenCalled();
    });

    test('100曲以上のトラックを分割して削除できること', async () => {
      const tracks = Array(150).fill(trackToRemove);
      await playlistService.removeTracks('playlist-id', tracks);
      expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenCalledTimes(2);
    });

    test('エラー時に適切に例外がスローされること', async () => {
      const error = new Error('API error');
      (error as any).statusCode = 401;
      mockSpotifyApi.removeTracksFromPlaylist.mockRejectedValueOnce(error);

      await expect(playlistService.removeTracks('playlist-id', [trackToRemove])).rejects.toThrow(
        'Failed to remove tracks from playlist',
      );
    });

    test('100曲の制限値でトラックを削除できること', async () => {
      const tracks = Array(100).fill(trackToRemove);
      await playlistService.removeTracks('playlist-id', tracks);
      expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenCalledTimes(1);
      expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenCalledWith(
        'playlist-id',
        tracks.map((t) => ({ uri: t.uri })),
      );
    });

    test('101曲のトラックを2回に分けて削除できること', async () => {
      const tracks = Array(101).fill(trackToRemove);
      await playlistService.removeTracks('playlist-id', tracks);
      expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenCalledTimes(2);
      expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenNthCalledWith(
        1,
        'playlist-id',
        tracks.slice(0, 100).map((t) => ({ uri: t.uri })),
      );
      expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenNthCalledWith(
        2,
        'playlist-id',
        tracks.slice(100).map((t) => ({ uri: t.uri })),
      );
    });

    test('一部のチャンクでエラーが発生した場合、処理を中断すること', async () => {
      const tracks = Array(150).fill(trackToRemove);
      const error = new Error('API error');
      (error as any).statusCode = 401;
      mockSpotifyApi.removeTracksFromPlaylist
        .mockResolvedValueOnce({
          body: { snapshot_id: 'snapshot1' },
          headers: {},
          statusCode: 201,
        })
        .mockRejectedValueOnce(error);

      await expect(playlistService.removeTracks('playlist-id', tracks)).rejects.toThrow(
        'Failed to remove tracks from playlist',
      );
      expect(mockSpotifyApi.removeTracksFromPlaylist).toHaveBeenCalledTimes(2);
    });

    it('トラック削除時にstatusCodeを持つエラーの場合、PlaylistErrorをスロー', async () => {
      mockSpotifyApi.removeTracksFromPlaylist.mockRejectedValueOnce({
        statusCode: 403,
        message: 'Forbidden',
      });

      await expect(playlistService.removeTracks('playlist-id', [trackToRemove])).rejects.toThrow(PlaylistError);
    });

    it('トラック削除時にSpotifyApiErrorの場合、PlaylistErrorをスロー', async () => {
      const error = new SpotifyApiError('API Error', 403);
      mockSpotifyApi.removeTracksFromPlaylist.mockRejectedValue(error);

      await expect(playlistService.removeTracks('playlist-id', [trackToRemove])).rejects.toThrow(PlaylistError);
    });
  });

  describe('getPlaylistTracks', () => {
    test('プレイリストのトラックが正常に取得できること', async () => {
      const tracks = await playlistService.getPlaylistTracks('playlist-id');
      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe(mockSpotifyTrack.id);
    });

    test('複数ページのトラックを取得できること', async () => {
      mockSpotifyApi.getPlaylistTracks
        .mockResolvedValueOnce({
          body: {
            items: [mockPlaylistTrack],
            total: 51,
            limit: 50,
            offset: 0,
            href: 'https://api.spotify.com/v1/playlists/playlist-id/tracks',
            next: 'https://api.spotify.com/v1/playlists/playlist-id/tracks?offset=50',
            previous: null,
          },
          headers: {},
          statusCode: 200,
        })
        .mockResolvedValueOnce({
          body: {
            items: [mockPlaylistTrack],
            total: 51,
            limit: 50,
            offset: 50,
            href: 'https://api.spotify.com/v1/playlists/playlist-id/tracks',
            next: null,
            previous: 'https://api.spotify.com/v1/playlists/playlist-id/tracks?offset=0',
          },
          headers: {},
          statusCode: 200,
        });

      const tracks = await playlistService.getPlaylistTracks('playlist-id');
      expect(tracks).toHaveLength(2);
      expect(mockSpotifyApi.getPlaylistTracks).toHaveBeenCalledTimes(2);
      expect(mockSpotifyApi.getPlaylistTracks).toHaveBeenNthCalledWith(1, 'playlist-id', {
        offset: 0,
        limit: 50,
      });
      expect(mockSpotifyApi.getPlaylistTracks).toHaveBeenNthCalledWith(2, 'playlist-id', {
        offset: 50,
        limit: 50,
      });
    });

    test('エラー時に適切に例外がスローされること', async () => {
      const error = new Error('API error');
      (error as any).statusCode = 401;
      mockSpotifyApi.getPlaylistTracks.mockRejectedValueOnce(error);

      await expect(playlistService.getPlaylistTracks('playlist-id')).rejects.toThrow('Failed to fetch playlist tracks');
    });
  });
});
