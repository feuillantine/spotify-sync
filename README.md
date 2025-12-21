# Spotify Playlist Sync

このプロジェクトは、GitHub Actionsを使用して定期的に特定のSpotifyユーザーのお気に入りに追加された曲を、別ユーザーの特定のプレイリストに自動的に追加するツールです。また、フォロー中のアーティストの同期も行います。

## 機能

- 特定のSpotifyユーザーのお気に入り曲を取得
- プレイリストに未追加の曲を特定
- 別ユーザーの特定プレイリストに新しい曲を追加
- フォロー中のアーティストを同期（ソースユーザーがフォローしているアーティストを自動的にターゲットユーザーでフォロー）
- GitHub Actionsによる定期的な実行

## セットアップ方法

### 1. Spotify開発者アカウントの設定

両方のSpotifyアカウント（ソースとターゲット）に対して以下の手順を実行します：

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)にログイン
2. 新しいアプリケーションを作成
3. Client IDとClient Secretを取得
4. Redirect URIを設定（例: `http://localhost:8888/callback`）
5. 必要なスコープを設定
   - `user-library-read`: お気に入り曲の読み取り用
   - `playlist-modify-public`: 公開プレイリストの編集用
   - `playlist-modify-private`: 非公開プレイリストの編集用
   - `user-follow-read`: フォロー中アーティストの読み取り用
   - `user-follow-modify`: アーティストのフォロー操作用
6. リフレッシュトークンを取得するためのコードを実行

### 2. プロジェクトのセットアップ

1. このリポジトリをクローン
2. 依存パッケージをインストール：
   ```
   pnpm i --frozen-lockfile
   ```
3. `.env.example`を`.env`にコピーして、必要な情報を入力（`SOURCE_REFRESH_TOKEN`、`TARGET_REFRESH_TOKEN`以外）
   ```
   cp .env.example .env
   ```

### 3. リフレッシュトークンの取得

以下のコマンドを実行して、各アカウントのリフレッシュトークンを取得します。

**ソースアカウントの場合:**

```bash
pnpm get-refresh-token --account source
```

**ターゲットアカウントの場合:**

```bash
pnpm get-refresh-token --account target
```

コマンドを実行すると、認証用のURLが表示されます。ブラウザでそのURLを開き、Spotifyアカウントでログインして認証を許可してください。
認証が成功すると、コンソールにリフレッシュトークンが表示されます。表示されたトークンをコピーし、`.env` ファイルの `SOURCE_REFRESH_TOKEN` または `TARGET_REFRESH_TOKEN` にそれぞれ設定してください。

### 4. GitHub Actionsの設定

1. GitHub上でリポジトリを作成
2. 必要な秘密情報（Secrets）をリポジトリの設定に追加：
   - `SOURCE_CLIENT_ID`
   - `SOURCE_CLIENT_SECRET`
   - `SOURCE_REFRESH_TOKEN`
   - `TARGET_CLIENT_ID`
   - `TARGET_CLIENT_SECRET`
   - `TARGET_REFRESH_TOKEN`
   - `TARGET_PLAYLIST_ID`
3. リポジトリをプッシュすると、GitHub Actionsが自動的に設定されます

## 手動実行

ローカルで手動実行する場合は以下のコマンドを使用します：

```
pnpm start
```

## 仕組み

1. ソースユーザーのお気に入り曲を取得
2. ターゲットプレイリストの現在の曲を取得
3. プレイリストに未追加の曲を特定
4. ターゲットユーザーの特定プレイリストに新しい曲を追加
5. ソースユーザーのフォロー中アーティストを取得
6. ターゲットユーザーでフォローしていないアーティストを特定
7. 新しいアーティストをターゲットユーザーでフォロー
