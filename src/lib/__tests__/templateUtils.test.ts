import { describe, it, expect } from 'vitest';
import { replacePlaceholders, TemplateUser } from '../templateUtils';

const BASE: TemplateUser = {
    userName: 'ADRIAN',
    email: 'adrian@example.com',
    phone: '6643663956',
    appName: 'VeloCrédito',
    productName: 'Yeye Cash',
    principal: 800,
    totalAmount: 1600,
    repayAmount: 1600,
    overdueFee: 800,
    overdueDay: 88,
    totalExtensionAmount: 350,
    repayTime: '2026-01-08',
    stageName: 'Stage1',
    idNoUrl: 'https://cdn.example.com/id.jpg',
    livingNessUrl: 'https://cdn.example.com/face.jpg',
};

// ─── text mode ────────────────────────────────────────────────────────────────

describe('replacePlaceholders — text mode', () => {
    it('replaces {{userName}}', () => {
        expect(replacePlaceholders('Hola {{userName}}', BASE)).toBe('Hola ADRIAN');
    });

    it('replaces {{phone}}', () => {
        expect(replacePlaceholders('Phone: {{phone}}', BASE)).toBe('Phone: 6643663956');
    });

    it('replaces {{contractAmount}} with totalAmount field', () => {
        expect(replacePlaceholders('Debt: {{contractAmount}}', BASE)).toBe('Debt: 1600');
    });

    it('replaces {{totalAmount}} with repayAmount field', () => {
        expect(replacePlaceholders('Due: {{totalAmount}}', BASE)).toBe('Due: 1600');
    });

    it('replaces {{overdueFee}}', () => {
        expect(replacePlaceholders('Fee: {{overdueFee}}', BASE)).toBe('Fee: 800');
    });

    it('replaces {{overdueDay}}', () => {
        expect(replacePlaceholders('Days: {{overdueDay}}', BASE)).toBe('Days: 88');
    });

    it('replaces {{extensionAmount}}', () => {
        expect(replacePlaceholders('Ext: {{extensionAmount}}', BASE)).toBe('Ext: 350');
    });

    it('replaces {{repayTime}}', () => {
        expect(replacePlaceholders('By: {{repayTime}}', BASE)).toBe('By: 2026-01-08');
    });

    it('replaces {{stageName}}', () => {
        expect(replacePlaceholders('Stage: {{stageName}}', BASE)).toBe('Stage: Stage1');
    });

    it('replaces multiple different placeholders in one template', () => {
        const tmpl = 'Hi {{userName}}, owe {{overdueFee}} by {{repayTime}}';
        expect(replacePlaceholders(tmpl, BASE))
            .toBe('Hi ADRIAN, owe 800 by 2026-01-08');
    });

    it('replaces all occurrences of the same placeholder', () => {
        expect(replacePlaceholders('{{userName}} / {{userName}}', BASE))
            .toBe('ADRIAN / ADRIAN');
    });

    it('strips {{idNoUrl}} in text mode (no img tag)', () => {
        expect(replacePlaceholders('ID: {{idNoUrl}}', BASE)).toBe('ID: ');
    });

    it('strips {{livingNessUrl}} in text mode (no img tag)', () => {
        expect(replacePlaceholders('Face: {{livingNessUrl}}', BASE)).toBe('Face: ');
    });

    it('does NOT convert newlines to <br> in text mode', () => {
        expect(replacePlaceholders('line1\nline2', BASE)).toBe('line1\nline2');
    });

    it('returns empty string for undefined optional field', () => {
        const user: TemplateUser = { ...BASE, overdueFee: undefined };
        expect(replacePlaceholders('Fee: {{overdueFee}}', user)).toBe('Fee: ');
    });

    it('returns "0" for numeric field that is 0', () => {
        const user: TemplateUser = { ...BASE, totalExtensionAmount: 0 };
        expect(replacePlaceholders('Ext: {{extensionAmount}}', user)).toBe('Ext: 0');
    });

    it('leaves unrecognised placeholders untouched', () => {
        expect(replacePlaceholders('{{unknown}}', BASE)).toBe('{{unknown}}');
    });
});

// ─── html mode ────────────────────────────────────────────────────────────────

describe('replacePlaceholders — html mode', () => {
    it('wraps {{idNoUrl}} in an <img> tag', () => {
        const result = replacePlaceholders('{{idNoUrl}}', BASE, 'html');
        expect(result).toContain('<img src="https://cdn.example.com/id.jpg"');
    });

    it('wraps {{livingNessUrl}} in an <img> tag', () => {
        const result = replacePlaceholders('{{livingNessUrl}}', BASE, 'html');
        expect(result).toContain('<img src="https://cdn.example.com/face.jpg"');
    });

    it('strips image placeholders when URLs are absent', () => {
        const user: TemplateUser = { ...BASE, idNoUrl: undefined, livingNessUrl: undefined };
        expect(replacePlaceholders('{{idNoUrl}}{{livingNessUrl}}', user, 'html')).toBe('');
    });

    it('converts newlines to <br> tags', () => {
        expect(replacePlaceholders('line1\nline2', BASE, 'html'))
            .toBe('line1<br>\nline2');
    });

    it('still replaces text placeholders in html mode', () => {
        expect(replacePlaceholders('Hi {{userName}}', BASE, 'html')).toBe('Hi ADRIAN');
    });
});
