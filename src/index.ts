import getConfig from './config/env';
import { SpotifyAuth, SpotifyFollowing, SpotifyPlaylist, SpotifyTracks } from './services/spotify';
import { handleError } from './utils/error';

async function main() {
  try {
    // 設定の読み込みとバリデーション
    const config = getConfig();

    // クライアントの初期化
    const sourceClient = SpotifyAuth.createClient(
      config.sourceClientId,
      config.sourceClientSecret,
      config.sourceRefreshToken,
    );

    const targetClient = SpotifyAuth.createClient(
      config.targetClientId,
      config.targetClientSecret,
      config.targetRefreshToken,
    );

    // サービスの初期化
    const tracks = new SpotifyTracks(sourceClient);
    const playlist = new SpotifyPlaylist(targetClient);
    const sourceFollowing = new SpotifyFollowing(sourceClient);
    const targetFollowing = new SpotifyFollowing(targetClient);

    // お気に入り曲の同期
    console.log('お気に入り曲を取得中...');
    const savedTracks = await tracks.getSavedTracks();
    console.log(`${savedTracks.length}件のお気に入り曲を取得`);

    console.log('プレイリストの曲を取得中...');
    const playlistTracks = await playlist.getPlaylistTracks(config.targetPlaylistId);
    console.log(`${playlistTracks.length}件のプレイリスト曲を取得`);

    console.log('新規追加曲を確認中...');
    const newTracks = savedTracks.filter((track) => !playlistTracks.some((pt) => pt.id === track.id));
    console.log(`${newTracks.length}件の新規追加曲を検出`);

    if (newTracks.length > 0) {
      console.log('プレイリストに新規追加曲を追加中...');
      await playlist.addTracks(config.targetPlaylistId, newTracks);
      console.log('曲の同期が完了');
    } else {
      console.log('新規追加曲なし');
    }

    // フォロー中アーティストの同期
    console.log('フォロー中アーティストを同期中...');
    const sourceFollowedArtists = await sourceFollowing.getFollowedArtists();
    const targetFollowedArtists = await targetFollowing.getFollowedArtists();

    const newFollowedArtists = sourceFollowedArtists.filter((id) => !targetFollowedArtists.includes(id));
    if (newFollowedArtists.length > 0) {
      console.log(`${newFollowedArtists.length}件の新規アーティストをフォロー中...`);
      await targetFollowing.followArtists(newFollowedArtists);
    } else {
      console.log('新規フォローアーティストなし');
    }

    console.log('アーティストの同期が完了');
  } catch (error) {
    handleError(error as Error);
  }
}

main();
