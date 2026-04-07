import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService, UserData } from '../email/EmailService';

// Mock GmailProvider so no real SMTP connection is made.
// The mock's send() resolves to a success result and captures its arguments.
const mockSend = vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' });

vi.mock('../email/providers/GmailProvider', () => ({
    GmailProvider: vi.fn().mockImplementation(function () {
        return { send: mockSend };
    }),
}));

const BASE_USER: UserData = {
    email: 'user@example.com',
    userName: 'John',
    phone: '5551234567',
    productName: 'LoanPro',
    principal: 1000,
    repayTime: '2026-05-01',
    stageName: 'Stage1',
};

function makeService() {
    return new EmailService({
        provider: 'gmail',
        gmail: { user: 'sender@gmail.com', appPassword: 'secret' },
    });
}

describe('EmailService – {{extensionAmount}} placeholder', () => {
    beforeEach(() => {
        mockSend.mockClear();
    });

    it('replaces {{extensionAmount}} with totalExtensionAmount when present', async () => {
        const service = makeService();
        const user: UserData = { ...BASE_USER, totalExtensionAmount: 350 };

        await service.sendToUser(user, 'Subject', 'Extension: {{extensionAmount}}');

        const body: string = mockSend.mock.calls[0][2];
        expect(body).toContain('Extension: 350');
    });

    it('replaces {{extensionAmount}} with empty string when totalExtensionAmount is undefined', async () => {
        const service = makeService();
        const user: UserData = { ...BASE_USER };

        await service.sendToUser(user, 'Subject', 'Extension: {{extensionAmount}}');

        const body: string = mockSend.mock.calls[0][2];
        expect(body).toContain('Extension: ');
        expect(body).not.toContain('{{extensionAmount}}');
    });

    it('replaces {{extensionAmount}} with 0 when totalExtensionAmount is 0', async () => {
        const service = makeService();
        const user: UserData = { ...BASE_USER, totalExtensionAmount: 0 };

        await service.sendToUser(user, 'Subject', 'Ext={{extensionAmount}}');

        const body: string = mockSend.mock.calls[0][2];
        expect(body).toContain('Ext=0');
    });

    it('replaces all occurrences of {{extensionAmount}} in the body', async () => {
        const service = makeService();
        const user: UserData = { ...BASE_USER, totalExtensionAmount: 200 };

        await service.sendToUser(
            user,
            'Subject',
            'First: {{extensionAmount}}, Second: {{extensionAmount}}'
        );

        const body: string = mockSend.mock.calls[0][2];
        expect(body).toBe('First: 200, Second: 200');
    });

    it('replaces {{extensionAmount}} in the subject line', async () => {
        const service = makeService();
        const user: UserData = { ...BASE_USER, totalExtensionAmount: 500 };

        await service.sendToUser(user, 'Ext {{extensionAmount}} due', 'body');

        const subject: string = mockSend.mock.calls[0][1];
        expect(subject).toBe('Ext 500 due');
    });

    it('does not affect other amount placeholders', async () => {
        const service = makeService();
        const user: UserData = {
            ...BASE_USER,
            totalAmount: 1500,
            repayAmount: 1600,
            overdueFee: 50,
            totalExtensionAmount: 75,
        };

        await service.sendToUser(
            user,
            'Subject',
            '{{contractAmount}} {{totalAmount}} {{overdueFee}} {{extensionAmount}}'
        );

        const body: string = mockSend.mock.calls[0][2];
        expect(body).toContain('1500');   // contractAmount → totalAmount field
        expect(body).toContain('1600');   // totalAmount → repayAmount field
        expect(body).toContain('50');     // overdueFee
        expect(body).toContain('75');     // extensionAmount
    });
});
