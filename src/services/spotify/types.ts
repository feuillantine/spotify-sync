/**
 * Spotifyトラックの基本情報
 */
export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  uri: string;
  added_at: string;
  album?: AlbumInfo;
  popularity?: number;
}

/**
 * アーティスト情報
 */
export interface Artist {
  id: string;
  name: string;
  uri?: string;
}

/**
 * アルバム情報
 */
export interface AlbumInfo {
  id: string;
  name: string;
  release_date?: string;
  images?: ImageInfo[];
}

/**
 * 画像情報
 */
export interface ImageInfo {
  url: string;
  height?: number;
  width?: number;
}

/**
 * トラックフィルタ用の型
 */
export interface TrackFilter {
  artists?: string[];
  minPopularity?: number;
  maxPopularity?: number;
  after?: Date;
  before?: Date;
}

/**
 * サービスの共通インターフェース
 */
export interface SpotifyTrackServiceInterface {
  getSavedTracks(): Promise<Track[]>;
  getTracksWithFilter(filter: TrackFilter): Promise<Track[]>;
}

export interface SpotifyPlaylistServiceInterface {
  addTracks(playlistId: string, tracks: Track[]): Promise<void>;
  createPlaylist(name: string, description?: string): Promise<string>;
  getPlaylistTracks(playlistId: string): Promise<Track[]>;
}

export interface SpotifyAuthServiceInterface {
  refreshToken(): Promise<void>;
}

/**
 * spotify-web-api-nodeの型定義を拡張
 */
export interface SpotifyApiCreatePlaylistResponse {
  body: {
    id: string;
    name: string;
    description: string;
    public: boolean;
    collaborative: boolean;
    uri: string;
    owner: {
      id: string;
      display_name: string;
      uri: string;
    };
  };
}
