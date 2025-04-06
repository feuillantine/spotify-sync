import path from 'node:path';
import { Command } from 'commander';
import dotenv from 'dotenv';
import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import { REQUIRED_SCOPES } from '../services/spotify/auth';

// 型定義
type AccountType = 'source' | 'target';

interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// 設定管理
function getEnvVars(accountType: AccountType): SpotifyConfig {
  const clientId = accountType === 'source' ? process.env.SOURCE_CLIENT_ID : process.env.TARGET_CLIENT_ID;
  const clientSecret = accountType === 'source' ? process.env.SOURCE_CLIENT_SECRET : process.env.TARGET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(`${accountType === 'source' ? 'ソース' : 'ターゲット'}アカウントの認証情報が見つかりません`);
    console.error('以下の環境変数を設定してください:');
    console.error(
      accountType === 'source'
        ? '  - SOURCE_CLIENT_ID\n  - SOURCE_CLIENT_SECRET'
        : '  - TARGET_CLIENT_ID\n  - TARGET_CLIENT_SECRET',
    );
    process.exit(1);
  }

  return {
    clientId,
    clientSecret,
    redirectUri: 'http://localhost:8888/callback',
  };
}

function initializeSpotifyApi(accountType: AccountType): SpotifyWebApi {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  const config = getEnvVars(accountType);
  return new SpotifyWebApi(config);
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

  start(spotifyApi: SpotifyWebApi, accountType: AccountType): void {
    this.setupRoutes(spotifyApi, accountType);
    this.server = this.app.listen(8888, () => {
      console.log(`\n${accountType === 'source' ? 'ソース' : 'ターゲット'}アカウントの認証サーバーを起動中...`);
      console.log('http://localhost:8888/login にアクセスしてください');
    });

    this.setupTimeout();
  }

  private setupRoutes(spotifyApi: SpotifyWebApi, accountType: AccountType): void {
    this.app.get('/login', (req, res) => {
      const authorizeURL = spotifyApi.createAuthorizeURL(REQUIRED_SCOPES, 'state');
      console.log(
        `\nSpotify認証ページへリダイレクトします (${accountType === 'source' ? 'ソース' : 'ターゲット'}アカウント)...`,
      );
      res.redirect(authorizeURL);
    });

    this.app.get('/callback', async (req, res) => {
      const { code } = req.query;

      if (!code) {
        res.status(400).send('認証コードが見つかりません');
        this.stop();
        return;
      }

      try {
        const data = await spotifyApi.authorizationCodeGrant(code as string);
        const { access_token, refresh_token } = data.body;

        console.log('\n--- 認証成功 ---');
        console.log(`アカウントタイプ: ${accountType === 'source' ? 'ソース' : 'ターゲット'}`);
        console.log('アクセストークン:', access_token);
        console.log('リフレッシュトークン:', refresh_token);
        console.log('-----------------');
        console.log(
          `\n上記のリフレッシュトークンを.envファイルの${
            accountType === 'source' ? 'SOURCE_REFRESH_TOKEN' : 'TARGET_REFRESH_TOKEN'
          }にコピーしてください`,
        );

        res.send(
          `${accountType === 'source' ? 'ソース' : 'ターゲット'}アカウントの認証が完了しました。このウィンドウを閉じてください。`,
        );
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
  const program = new Command();
  program.requiredOption('-a, --account <type>', "アカウントタイプ: 'source' または 'target'").parse(process.argv);

  const options = program.opts();
  const accountType = options.account as AccountType;

  if (accountType !== 'source' && accountType !== 'target') {
    console.error("無効なアカウントタイプです。'source' または 'target' を指定してください。");
    process.exit(1);
  }

  const spotifyApi = initializeSpotifyApi(accountType);
  const server = new AuthServer();
  server.start(spotifyApi, accountType);
}

main();
