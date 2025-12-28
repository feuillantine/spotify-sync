import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import { buildAuthorizeUrl, fetchAccessToken } from 'spotify-utility';

interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// 必要スコープ
const requiredScopes = ['user-library-read', 'playlist-modify-public', 'playlist-modify-private'];

// 設定管理
function getConfig(): SpotifyConfig {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('アカウントの認証情報が見つかりません');
    console.error('以下の環境変数を設定してください:');
    console.error('  - CLIENT_ID\n  - CLIENT_SECRET');
    process.exit(1);
  }

  return {
    clientId,
    clientSecret,
    redirectUri: 'http://127.0.0.1:8888/callback',
  };
}

// サーバー管理
class AuthServer {
  private server: ReturnType<express.Application['listen']> | null = null;
  private readonly TIMEOUT_MS = 5 * 60 * 1000;
  private readonly app: express.Application;

  constructor() {
    this.app = express();
    this.setupSignalHandlers();
  }

  start(config: SpotifyConfig): void {
    this.setupRoutes(config);
    this.server = this.app.listen(8888, () => {
      console.log('\n認証サーバーを起動中...');
      console.log('http://127.0.0.1:8888/login にアクセスしてください');
    });

    this.setupTimeout();
  }

  private setupRoutes(config: SpotifyConfig): void {
    this.app.get('/login', (req, res) => {
      console.log('\nSpotify認証ページへリダイレクトします...');
      const authorizeUrl = buildAuthorizeUrl(config.clientId, config.redirectUri, requiredScopes);
      res.redirect(authorizeUrl);
    });

    this.app.get('/callback', async (req, res) => {
      const { code } = req.query;

      if (typeof code !== 'string') {
        res.status(400).send('認証コードが見つかりません');
        this.stop();
        return;
      }

      try {
        const accessToken = await fetchAccessToken(config.clientId, config.clientSecret, code, config.redirectUri);
        console.log('\n--- 認証成功 ---');
        console.log('リフレッシュトークン:', accessToken.refresh_token);
        console.log('-----------------');
        console.log('\n上記のリフレッシュトークンを.envファイルのREFRESH_TOKENにコピーしてください');

        res.send('認証が完了しました。このウィンドウを閉じてください。');
      } catch (error) {
        console.error('\n認証コードの取得中にエラーが発生:', error);
        res.status(500).send('認証中にエラーが発生しました');
      } finally {
        this.stop();
      }
    });
  }

  private setupTimeout(): void {
    setTimeout(() => {
      if (this.server?.listening) {
        console.error('\n認証がタイムアウトしました。サーバーを停止します。');
        this.stop();
        return;
      }
    }, this.TIMEOUT_MS);
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => {
      console.log('\nCtrl+Cが押されました。サーバーを停止します...');
      this.stop();
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close(() => {
        console.log('サーバーを停止しました');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

// メイン処理
function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  const config = getConfig();
  const server = new AuthServer();
  server.start(config);
}

main();
