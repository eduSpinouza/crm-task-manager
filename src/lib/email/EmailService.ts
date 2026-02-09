import { EmailProvider, EmailSendResult } from './EmailProvider';
import { GmailProvider } from './providers/GmailProvider';

export interface UserData {
    email: string;
    userName: string;
    phone: string;
    productName: string;
    principal: number;
    repayTime: string;
    stageName: string;
    [key: string]: any;
}

export interface EmailServiceConfig {
    provider: 'gmail'; // | 'resend' | 'brevo' for future
    gmail?: {
        user: string;
        appPassword: string;
    };
}

export class EmailService {
    private provider: EmailProvider;

    constructor(config: EmailServiceConfig) {
        switch (config.provider) {
            case 'gmail':
                if (!config.gmail) {
                    throw new Error('Gmail configuration required');
                }
                this.provider = new GmailProvider(config.gmail);
                break;
            default:
                throw new Error(`Unknown email provider: ${config.provider}`);
        }
    }

    // Replace placeholders in template with user data
    private replacePlaceholders(template: string, user: UserData): string {
        let result = template;
        const placeholders: Record<string, string> = {
            '{{userName}}': user.userName || '',
            '{{email}}': user.email || '',
            '{{phone}}': user.phone || '',
            '{{appName}}': user.appName || '',
            '{{productName}}': user.productName || '',
            '{{principal}}': String(user.principal || ''),
            '{{contractAmount}}': String(user.totalAmount || ''),
            '{{totalAmount}}': String(user.repayAmount || ''),
            '{{overdueFee}}': String(user.overdueFee || ''),
            '{{repayTime}}': user.repayTime || '',
            '{{stageName}}': user.stageName || '',
            '{{idNoUrl}}': user.idNoUrl ? `<img src="${user.idNoUrl}" width="200" style="max-width:100%;" />` : '',
            '{{livingNessUrl}}': user.livingNessUrl ? `<img src="${user.livingNessUrl}" width="200" style="max-width:100%;" />` : '',
        };

        for (const [placeholder, value] of Object.entries(placeholders)) {
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }

        // Convert newlines to HTML <br> tags so line breaks are preserved
        result = result.replace(/\n/g, '<br>\n');

        return result;
    }

    // Send email to a single user with placeholder replacement
    async sendToUser(
        user: UserData,
        subjectTemplate: string,
        bodyTemplate: string
    ): Promise<EmailSendResult> {
        const subject = this.replacePlaceholders(subjectTemplate, user);
        const body = this.replacePlaceholders(bodyTemplate, user);

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
