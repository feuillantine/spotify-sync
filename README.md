# Spotify Playlist Sync

このプロジェクトは、GitHub Actionsを使用して定期的にSpotifyユーザーのお気に入りに追加された曲を、特定のプレイリストに自動的に同期するツールです。

## 機能

- お気に入り曲を取得
- プレイリストに未追加の曲を特定
- プレイリストに新しい曲を追加
- プレイリストから削除された曲を削除
- GitHub Actionsによる定期的な実行

## セットアップ方法

### 1. Spotify開発者アカウントの設定

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)にログイン
2. 新しいアプリケーションを作成
3. Client IDとClient Secretを取得
4. Redirect URIを設定（例: `http://localhost:8888/callback`）
5. 必要なスコープを設定
   - `user-library-read`: お気に入り曲の読み取り用
   - `playlist-modify-public`: 公開プレイリストの編集用
   - `playlist-modify-private`: 非公開プレイリストの編集用
6. リフレッシュトークンを取得するためのコードを実行

### 2. プロジェクトのセットアップ

1. このリポジトリをクローン
2. 依存パッケージをインストール：
   ```
   pnpm i --frozen-lockfile
   ```
3. `.env.example`を`.env`にコピーして、必要な情報を入力（`REFRESH_TOKEN`以外）
   ```
   cp .env.example .env
   ```

### 3. リフレッシュトークンの取得

以下のコマンドを実行して、リフレッシュトークンを取得します。

```bash
pnpm get-refresh-token
```

コマンドを実行すると、認証用のURLが表示されます。ブラウザでそのURLを開き、Spotifyアカウントでログインして認証を許可してください。
認証が成功すると、コンソールにリフレッシュトークンが表示されます。表示されたトークンをコピーし、`.env` ファイルの `REFRESH_TOKEN` に設定してください。

### 4. GitHub Actionsの設定

1. GitHub上でリポジトリを作成
2. 必要な秘密情報（Secrets）をリポジトリの設定に追加：
   - `CLIENT_ID`
   - `CLIENT_SECRET`
   - `REFRESH_TOKEN`
   - `PLAYLIST_ID`
3. リポジトリをプッシュすると、GitHub Actionsが自動的に設定されます

## 手動実行

ローカルで手動実行する場合は以下のコマンドを使用します：

```
pnpm start
```

## 仕組み

1. お気に入り曲を取得
2. プレイリストの現在の曲を取得
3. プレイリストに未追加の曲を特定して追加
4. お気に入りから削除された曲をプレイリストから削除
