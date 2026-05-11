import { EmailProvider, EmailSendResult } from '../EmailProvider';

export interface GmailRestConfig {
    user: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

export class GmailRestProvider implements EmailProvider {
    private senderEmail: string;
    private clientId: string;
    private clientSecret: string;
    private refreshToken: string;

    constructor(config: GmailRestConfig) {
        this.senderEmail = config.user;
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.refreshToken = config.refreshToken;
    }

    private async getAccessToken(): Promise<string> {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        const data = await res.json();

        if (!res.ok || !data.access_token) {
            throw new Error(`Failed to get access token: ${data.error ?? 'unknown'} — ${data.error_description ?? ''}`);
        }

        return data.access_token;
    }

    private buildRawMessage(to: string, subject: string, htmlBody: string): string {
        const message = [
            `From: ${this.senderEmail}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            htmlBody,
        ].join('\r\n');

        return Buffer.from(message).toString('base64url');
    }

    async send(to: string, subject: string, htmlBody: string): Promise<EmailSendResult> {
        console.log(`[GmailREST] Attempting to send to: ${to}`);
        console.log(`[GmailREST] From: ${this.senderEmail}`);

        try {
            const accessToken = await this.getAccessToken();
            const raw = this.buildRawMessage(to, subject, htmlBody);

            const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error?.message ?? 'Gmail API error');
            }

            console.log(`[GmailREST] SUCCESS - MessageId: ${data.id}`);
            return { success: true, messageId: data.id };
        } catch (error: any) {
            console.error('[GmailREST] FAILED - Error:', error.message);
            return { success: false, error: error.message };
        }
    }
}
