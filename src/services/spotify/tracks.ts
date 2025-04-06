import type SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyApiError, TrackError, withRetry } from '../../utils/error';
import { SpotifyAuth } from './auth';
import type { SpotifyTrackServiceInterface, Track, TrackFilter } from './types';

export class SpotifyTracks implements SpotifyTrackServiceInterface {
  private auth: SpotifyAuth;

  constructor(private client: SpotifyWebApi) {
    this.auth = new SpotifyAuth(client);
  }

  async getSavedTracks(): Promise<Track[]> {
    await this.auth.refreshToken();

    const tracks: Track[] = [];
    let offset = 0;
    const limit = 50;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      try {
        const response = await withRetry(async () => {
          return await this.client.getMySavedTracks({
            limit,
            offset,
          });
        });

        total = response.body.total;

        const fetchedTracks = response.body.items.map((item) => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists.map((artist) => ({
            id: artist.id,
            name: artist.name,
            uri: artist.uri,
          })),
          uri: item.track.uri,
          added_at: item.added_at,
          album: item.track.album
            ? {
                id: item.track.album.id,
                name: item.track.album.name,
                release_date: item.track.album.release_date,
                images: item.track.album.images?.map((image) => ({
                  url: image.url,
                  height: image.height || undefined,
                  width: image.width || undefined,
                })),
              }
            : undefined,
          popularity: item.track.popularity,
        }));

        tracks.push(...fetchedTracks);
        offset += limit;
      } catch (error) {
        if (error instanceof SpotifyApiError) {
          throw new TrackError('Failed to fetch saved tracks', undefined, error);
        }
        if (error instanceof Error && 'statusCode' in error) {
          throw new TrackError('Failed to fetch saved tracks', undefined, error);
        }
        throw new TrackError(
          'Failed to fetch saved tracks',
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined,
        );
      }
    }

    return tracks;
  }

  async getTracksWithFilter(filter: TrackFilter): Promise<Track[]> {
    const tracks = await this.getSavedTracks();

    return tracks.filter((track) => {
      // 人気度フィルタ
      if (
        filter.minPopularity !== undefined &&
        (track.popularity === undefined || track.popularity < filter.minPopularity)
      ) {
        return false;
      }

      if (
        filter.maxPopularity !== undefined &&
        (track.popularity === undefined || track.popularity > filter.maxPopularity)
      ) {
        return false;
      }

      // アーティストフィルタ
      if (filter.artists && filter.artists.length > 0) {
        const artistNames = track.artists.map((a) => a.name.toLowerCase());
        if (!filter.artists.some((name) => artistNames.includes(name.toLowerCase()))) {
          return false;
        }
      }

      // 日付フィルタ
      const addedDate = new Date(track.added_at);

      if (filter.after && addedDate < filter.after) {
        return false;
      }

      if (filter.before && addedDate > filter.before) {
        return false;
      }

      return true;
    });
  }
}
