// Email Provider Interface - allows easy switching between email services
export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface EmailProvider {
    send(to: string, subject: string, htmlBody: string): Promise<EmailSendResult>;
}
