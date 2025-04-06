import SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyApiError } from '../../../utils/error';
import { SpotifyAuth } from '../auth';

jest.mock('spotify-web-api-node');

describe('SpotifyAuth', () => {
  let mockSpotifyApi: jest.Mocked<SpotifyWebApi>;

  beforeEach(() => {
    mockSpotifyApi = new SpotifyWebApi() as jest.Mocked<SpotifyWebApi>;
    jest.clearAllMocks();
  });

  describe('refreshToken', () => {
    test('トークンの更新に成功した場合、新しいアクセストークンを設定する', async () => {
      const mockAccessToken = 'new-access-token';
      mockSpotifyApi.refreshAccessToken.mockResolvedValue({
        body: { access_token: mockAccessToken },
      } as any);

      const auth = new SpotifyAuth(mockSpotifyApi);
      await auth.refreshToken();

      expect(mockSpotifyApi.refreshAccessToken).toHaveBeenCalled();
      expect(mockSpotifyApi.setAccessToken).toHaveBeenCalledWith(mockAccessToken);
    });

    test('APIエラーの場合、SpotifyApiErrorを投げる', async () => {
      const mockError = Object.assign(new Error('Invalid refresh token'), {
        statusCode: 401,
      });
      mockSpotifyApi.refreshAccessToken.mockRejectedValue(mockError);

      const auth = new SpotifyAuth(mockSpotifyApi);
      await expect(auth.refreshToken()).rejects.toThrow(
        new SpotifyApiError('Failed to refresh access token', 401, mockError),
      );
    });

    test('不明なエラーの場合、500のSpotifyApiErrorを投げる', async () => {
      const mockError = new Error('Unknown error');
      mockSpotifyApi.refreshAccessToken.mockRejectedValue(mockError);

      const auth = new SpotifyAuth(mockSpotifyApi);
      await expect(auth.refreshToken()).rejects.toThrow(
        new SpotifyApiError('Failed to refresh access token', 500, mockError),
      );
    });
  });

  describe('createClient', () => {
    test('正しいパラメータでSpotifyWebApiクライアントを作成する', () => {
      const clientId = 'test-client-id';
      const clientSecret = 'test-client-secret';
      const refreshToken = 'test-refresh-token';

      SpotifyAuth.createClient(clientId, clientSecret, refreshToken);

      expect(SpotifyWebApi).toHaveBeenCalledWith({
        clientId,
        clientSecret,
        refreshToken,
      });
    });
  });

  describe('createAuthUrl', () => {
    test('認証URLを正しく生成する', () => {
      const clientId = 'test-client-id';
      const redirectUri = 'http://localhost:3000/callback';
      const mockCreateAuthorizeURL = jest.fn().mockReturnValue('http://example.com/auth');

      (SpotifyWebApi as jest.Mock).mockImplementation(() => ({
        createAuthorizeURL: mockCreateAuthorizeURL,
      }));

      const url = SpotifyAuth.createAuthUrl(clientId, redirectUri);

      expect(SpotifyWebApi).toHaveBeenCalledWith({
        clientId,
        redirectUri,
      });
      expect(mockCreateAuthorizeURL).toHaveBeenCalled();
      expect(url).toBe('http://example.com/auth');
    });
  });
});
