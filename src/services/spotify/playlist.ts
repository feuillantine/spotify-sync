import type SpotifyWebApi from 'spotify-web-api-node';
import { PlaylistError, SpotifyApiError, withRetry } from '../../utils/error';
import { SpotifyAuth } from './auth';
import type { SpotifyApiCreatePlaylistResponse, SpotifyPlaylistServiceInterface, Track } from './types';

export class SpotifyPlaylist implements SpotifyPlaylistServiceInterface {
  private auth: SpotifyAuth;

  constructor(private client: SpotifyWebApi) {
    this.auth = new SpotifyAuth(client);
  }

  async addTracks(playlistId: string, tracks: Track[]): Promise<void> {
    if (tracks.length === 0) {
      console.log('No tracks to add');
      return;
    }

    await this.auth.refreshToken();

    const trackUris = tracks.map((track) => track.uri);
    const chunkedTrackUris = [];

    for (let i = 0; i < trackUris.length; i += 100) {
      chunkedTrackUris.push(trackUris.slice(i, i + 100));
    }

    for (const chunk of chunkedTrackUris) {
      try {
        await withRetry(async () => {
          await this.client.addTracksToPlaylist(playlistId, chunk);
        });
      } catch (error) {
        if (error instanceof SpotifyApiError) {
          throw new PlaylistError('Failed to add tracks to playlist', undefined, error);
        }
        if (error instanceof Error && 'statusCode' in error) {
          throw new PlaylistError('Failed to add tracks to playlist', undefined, error);
        }
        throw new PlaylistError(
          'Failed to add tracks to playlist',
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined,
        );
      }
    }

    console.log(`Added ${tracks.length} tracks to playlist`);
  }

  async removeTracks(playlistId: string, tracks: Track[]): Promise<void> {
    if (tracks.length === 0) {
      console.log('No tracks to remove');
      return;
    }
    await this.auth.refreshToken();
    const uris = tracks.map(t => t.uri);
    for (let i = 0; i < uris.length; i += 100) {
      const chunk = uris.slice(i, i + 100);
      try {
        await withRetry(async () => {
          await this.client.removeTracksFromPlaylist(playlistId, chunk.map(uri => ({ uri })));
        });
      } catch (error) {
        if (error instanceof SpotifyApiError) {
          throw new PlaylistError('Failed to remove tracks from playlist', undefined, error);
        }
        if (error instanceof Error && 'statusCode' in error) {
          throw new PlaylistError('Failed to remove tracks from playlist', undefined, error);
        }
        throw new PlaylistError(
          'Failed to remove tracks from playlist',
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined,
        );
      }
    }
    console.log(`Removed ${tracks.length} tracks from playlist`);
  }

  async createPlaylist(name: string, description?: string): Promise<string> {
    await this.auth.refreshToken();

    try {
      const response = await withRetry(async () => {
        await this.client.getMe();
        const createResponse = (await this.client.createPlaylist(name, {
          description,
          public: false,
        })) as SpotifyApiCreatePlaylistResponse;
        return createResponse.body.id;
      });

      return response;
    } catch (error) {
      if (error instanceof SpotifyApiError) {
        throw new PlaylistError('Failed to create playlist', undefined, error);
      }
      if (error instanceof Error && 'statusCode' in error) {
        throw new PlaylistError('Failed to create playlist', undefined, error);
      }
      throw new PlaylistError(
        'Failed to create playlist',
        { error: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    await this.auth.refreshToken();

    const tracks: Track[] = [];
    let offset = 0;
    const limit = 50;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      try {
        const response = await withRetry(async () => {
          return await this.client.getPlaylistTracks(playlistId, {
            limit,
            offset,
          });
        });

        total = response.body.total;

        const fetchedTracks = response.body.items
          .filter((item) => item.track !== null)
          .map((item) => {
            const track = item.track;
            if (!track) return null;
            const mappedTrack: Track = {
              id: track.id,
              name: track.name,
              artists: track.artists.map((artist) => ({
                id: artist.id,
                name: artist.name,
                uri: artist.uri || '',
              })),
              uri: track.uri,
              added_at: item.added_at,
              album: track.album
                ? {
                  id: track.album.id,
                  name: track.album.name,
                  release_date: track.album.release_date,
                  images: track.album.images?.map((image) => ({
                    url: image.url,
                    height: image.height || undefined,
                    width: image.width || undefined,
                  })),
                }
                : undefined,
              popularity: track.popularity,
            };
            return mappedTrack;
          })
          .filter((track): track is Track => track !== null);

        tracks.push(...fetchedTracks);
        offset += limit;
      } catch (error) {
        if (error instanceof SpotifyApiError) {
          throw new PlaylistError('Failed to fetch playlist tracks', undefined, error);
        }
        if (error instanceof Error && 'statusCode' in error) {
          throw new PlaylistError('Failed to fetch playlist tracks', undefined, error);
        }
        throw new PlaylistError(
          'Failed to fetch playlist tracks',
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined,
        );
      }
    }

    return tracks;
  }
}
