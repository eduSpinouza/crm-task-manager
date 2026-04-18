/**
 * Google OAuth2 access-token minting for the Sheets export feature.
 *
 * Exchanges a stored refresh token for a short-lived access token
 * via the standard grant_type=refresh_token flow. Tokens are not cached
 * (they live 1 hour and exports are one-shot operations).
 */

interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    error?: string;
    error_description?: string;
}

/**
 * Mint a Google OAuth2 access token from a refresh token.
 *
 * @throws Error with message "invalid_grant" when the refresh token has
 *   been revoked — callers should delete the stored account and surface
 *   a re-connect prompt.
 * @throws Error on other non-OK responses or network failures.
 */
export async function mintAccessToken(refreshToken: string): Promise<string> {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
    }

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    const data: TokenResponse = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Token refresh failed: ${response.status}`);
    }

    return data.access_token;
}
