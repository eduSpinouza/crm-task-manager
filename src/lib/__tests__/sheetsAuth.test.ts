import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-client-secret';

// Import AFTER env is set
import { mintAccessToken } from '../sheetsAuth';

const REFRESH_TOKEN = 'rt_test_refresh_token';

function mockFetch(status: number, body: object) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    });
}

describe('mintAccessToken', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns access_token on success', async () => {
        vi.stubGlobal('fetch', mockFetch(200, { access_token: 'ya29.access', expires_in: 3600, token_type: 'Bearer' }));
        const token = await mintAccessToken(REFRESH_TOKEN);
        expect(token).toBe('ya29.access');
    });

    it('throws an error with message "invalid_grant" on token revocation', async () => {
        vi.stubGlobal('fetch', mockFetch(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }));
        await expect(mintAccessToken(REFRESH_TOKEN)).rejects.toThrow('invalid_grant');
    });

    it('throws on other non-ok responses', async () => {
        vi.stubGlobal('fetch', mockFetch(500, { error: 'internal_error' }));
        await expect(mintAccessToken(REFRESH_TOKEN)).rejects.toThrow('internal_error');
    });

    it('sends a POST request to the Google token endpoint', async () => {
        const fetchMock = mockFetch(200, { access_token: 'tok', expires_in: 3600, token_type: 'Bearer' });
        vi.stubGlobal('fetch', fetchMock);
        await mintAccessToken(REFRESH_TOKEN);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://oauth2.googleapis.com/token',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('sends the correct URL-encoded form body', async () => {
        const fetchMock = mockFetch(200, { access_token: 'tok', expires_in: 3600, token_type: 'Bearer' });
        vi.stubGlobal('fetch', fetchMock);
        await mintAccessToken(REFRESH_TOKEN);
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        const body = init.body as string;
        expect(body).toContain('grant_type=refresh_token');
        expect(body).toContain(`refresh_token=${encodeURIComponent(REFRESH_TOKEN)}`);
        expect(body).toContain('client_id=test-client-id');
        expect(body).toContain('client_secret=test-client-secret');
    });

    it('throws when OAuth credentials are not configured', async () => {
        const savedId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const savedSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        delete process.env.GOOGLE_OAUTH_CLIENT_ID;
        delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        await expect(mintAccessToken(REFRESH_TOKEN)).rejects.toThrow('not configured');
        process.env.GOOGLE_OAUTH_CLIENT_ID = savedId;
        process.env.GOOGLE_OAUTH_CLIENT_SECRET = savedSecret;
    });
});
