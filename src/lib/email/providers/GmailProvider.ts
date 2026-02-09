import nodemailer from 'nodemailer';
import { EmailProvider, EmailSendResult } from '../EmailProvider';

export interface GmailConfig {
    user: string;
    appPassword: string;
}

export class GmailProvider implements EmailProvider {
    private transporter: nodemailer.Transporter;
    private senderEmail: string;

    constructor(config: GmailConfig) {
        this.senderEmail = config.user;
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.user,
                pass: config.appPassword,
            },
        });
    }

    async send(to: string, subject: string, htmlBody: string): Promise<EmailSendResult> {
        console.log(`[Gmail] Attempting to send email to: ${to}`);
        console.log(`[Gmail] Subject: ${subject}`);
        console.log(`[Gmail] From: ${this.senderEmail}`);

        try {
            const info = await this.transporter.sendMail({
                from: this.senderEmail,
                to,
                subject,
                html: htmlBody,
            });

            console.log(`[Gmail] SUCCESS - MessageId: ${info.messageId}`);
            return {
                success: true,
                messageId: info.messageId,
            };
        } catch (error: any) {
            console.error('[Gmail] FAILED - Error:', error.message);
            console.error('[Gmail] Full error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
