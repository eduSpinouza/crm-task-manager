import nodemailer from 'nodemailer';
import { EmailProvider, EmailSendResult } from '../EmailProvider';

export interface GmailOAuthConfig {
    user: string;         // Gmail address
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

export class GmailOAuthProvider implements EmailProvider {
    private transporter: nodemailer.Transporter;
    private senderEmail: string;

    constructor(config: GmailOAuthConfig) {
        this.senderEmail = config.user;
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                user: config.user,
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                refreshToken: config.refreshToken,
            },
        });
    }

    async send(to: string, subject: string, htmlBody: string): Promise<EmailSendResult> {
        console.log(`[GmailOAuth] Attempting to send email to: ${to}`);
        console.log(`[GmailOAuth] Subject: ${subject}`);
        console.log(`[GmailOAuth] From: ${this.senderEmail}`);

        try {
            const info = await this.transporter.sendMail({
                from: this.senderEmail,
                to,
                subject,
                html: htmlBody,
            });

            console.log(`[GmailOAuth] SUCCESS - MessageId: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error: any) {
            console.error('[GmailOAuth] FAILED - Error:', error.message);
            return { success: false, error: error.message };
        }
    }
}
