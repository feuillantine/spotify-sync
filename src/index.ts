import { createSpotifyUtility } from 'spotify-utility';
import getConfig from './config/env';

async function main() {
  try {
    // 設定の読み込みとバリデーション
    const config = getConfig();

    // クライアントの初期化
    const client = await createSpotifyUtility({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    });

    // 情報取得
    console.log('お気に入り曲を取得中...');
    const savedTrackUris = await client.tracks.listMyFavoriteUris();
    console.log(`${savedTrackUris.size}件のお気に入り曲を取得`);
    console.log('プレイリストの曲を取得中...');
    const playlistTrackUris = await client.playlists.listTrackUris(config.playlistId);
    console.log(`${playlistTrackUris.size}件のプレイリスト曲を取得`);
    console.log('差分を確認中...');

    // 新規追加
    const newTrackUris = savedTrackUris.difference(playlistTrackUris);
    console.log(`${newTrackUris.size}件の新規追加曲を検出`);
    if (newTrackUris.size > 0) {
      console.log('プレイリストに新規追加曲を追加中...');
      await client.playlists.addTracks(config.playlistId, newTrackUris);
    } else {
      console.log('新規追加曲なし');
    }

    // 削除
    const deletedTrackUris = playlistTrackUris.difference(savedTrackUris);
    console.log(`${deletedTrackUris.size}件の削除曲を検出`);
    if (deletedTrackUris.size > 0) {
      console.log('プレイリストから削除曲を削除中...');
      await client.playlists.removeTracks(config.playlistId, deletedTrackUris);
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
