import { EmailProvider, EmailSendResult } from './EmailProvider';
import { GmailProvider } from './providers/GmailProvider';
import { GmailOAuthProvider } from './providers/GmailOAuthProvider';
import { GmailRestProvider } from './providers/GmailRestProvider';
import { replacePlaceholders } from '../templateUtils';

export interface UserData {
    email: string;
    userName: string;
    phone: string;
    productName: string;
    principal: number;
    repayTime: string;
    stageName: string;
    totalExtensionAmount?: number;
    [key: string]: any;
}

export type EmailServiceConfig =
    | {
          provider: 'gmail-rest';
          user: string;
          clientId: string;
          clientSecret: string;
          refreshToken: string;
      }
    | {
          // Legacy SMTP OAuth path — kept for rollback safety
          provider: 'gmail-oauth';
          user: string;
          clientId: string;
          clientSecret: string;
          refreshToken: string;
      }
    | {
          // Legacy app-password path — kept for rollback safety
          provider: 'gmail';
          gmail: { user: string; appPassword: string };
      };

export class EmailService {
    private provider: EmailProvider;

    constructor(config: EmailServiceConfig) {
        switch (config.provider) {
            case 'gmail-rest':
                this.provider = new GmailRestProvider({
                    user: config.user,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    refreshToken: config.refreshToken,
                });
                break;
            case 'gmail-oauth':
                this.provider = new GmailOAuthProvider({
                    user: config.user,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    refreshToken: config.refreshToken,
                });
                break;
            case 'gmail':
                if (!config.gmail) {
                    throw new Error('Gmail configuration required');
                }
                this.provider = new GmailProvider(config.gmail);
                break;
            default:
                throw new Error(`Unknown email provider`);
        }
    }

    // Send email to a single user with placeholder replacement
    async sendToUser(
        user: UserData,
        subjectTemplate: string,
        bodyTemplate: string
    ): Promise<EmailSendResult> {
        const subject = replacePlaceholders(subjectTemplate, user, 'html');
        const body = replacePlaceholders(bodyTemplate, user, 'html');

        return this.provider.send(user.email, subject, body);
    }

    // Send emails to multiple users with rate limiting
    async sendToUsers(
        users: UserData[],
        subjectTemplate: string,
        bodyTemplate: string,
        delayMs: number = 200
    ): Promise<{ sent: number; failed: number; results: EmailSendResult[] }> {
        const results: EmailSendResult[] = [];
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < users.length; i++) {
            const user = users[i];

            if (!user.email) {
                results.push({ success: false, error: 'No email address' });
                failed++;
                continue;
            }

            const result = await this.sendToUser(user, subjectTemplate, bodyTemplate);
            results.push(result);

            if (result.success) {
                sent++;
            } else {
                failed++;
            }

            // Rate limiting: delay between sends (except for last one)
            if (i < users.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        return { sent, failed, results };
    }
}
