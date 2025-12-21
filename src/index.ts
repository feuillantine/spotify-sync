import { createSpotifyUtility } from 'spotify-utility';
import getConfig from './config/env';

async function main() {
  try {
    // 設定の読み込みとバリデーション
    const config = getConfig();

    // クライアントの初期化
    const sourceClient = await createSpotifyUtility({
      clientId: config.sourceClientId,
      clientSecret: config.sourceClientSecret,
      refreshToken: config.sourceRefreshToken,
    });

    const targetClient = await createSpotifyUtility({
      clientId: config.targetClientId,
      clientSecret: config.targetClientSecret,
      refreshToken: config.targetRefreshToken,
    });

    // お気に入り曲の同期
    console.log('お気に入り曲を取得中...');
    const savedTrackUris = await sourceClient.tracks.listMyFavoriteUris();
    console.log(`${savedTrackUris.size}件のお気に入り曲を取得`);

    console.log('プレイリストの曲を取得中...');
    const playlistTrackUris = await targetClient.playlists.listTrackUris(config.targetPlaylistId);
    console.log(`${playlistTrackUris.size}件のプレイリスト曲を取得`);

    console.log('差分を確認中...');

    // 新規追加
    const newTrackUris = new Set(
      [...savedTrackUris].filter((uri) => !playlistTrackUris.has(uri))
    );
    console.log(`${newTrackUris.size}件の新規追加曲を検出`);
    if (newTrackUris.size > 0) {
      console.log('プレイリストに新規追加曲を追加中...');
      await targetClient.playlists.addTracks(config.targetPlaylistId, newTrackUris);
    } else {
      console.log('新規追加曲なし');
    }

    // 削除
    const deletedTrackUris = new Set(
      [...playlistTrackUris].filter((uri) => !savedTrackUris.has(uri))
    );
    console.log(`${deletedTrackUris.size}件の削除曲を検出`);

    if (deletedTrackUris.size > 0) {
      console.log('プレイリストから削除曲を削除中...');
      await targetClient.playlists.removeTracks(config.targetPlaylistId, deletedTrackUris);
    } else {
      console.log('削除曲なし');
    }

    console.log('プレイリストの同期が完了');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
