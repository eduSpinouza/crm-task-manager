import { describe, it, expect } from 'vitest';
import { resolveFollowResult } from '../followResult';

describe('resolveFollowResult', () => {
    it('returns Not contacted for null', () => {
        const r = resolveFollowResult(null);
        expect(r.label).toBe('Not contacted');
        expect(r.bold).toBe(false);
    });

    it('returns Not contacted for undefined', () => {
        expect(resolveFollowResult(undefined).label).toBe('Not contacted');
    });

    it('returns Not contacted for empty string', () => {
        expect(resolveFollowResult('').label).toBe('Not contacted');
    });

    it('returns Not contacted for 0 (numeric sentinel)', () => {
        expect(resolveFollowResult(0).label).toBe('Not contacted');
    });

    it('returns Not contacted for NONE', () => {
        expect(resolveFollowResult('NONE').label).toBe('Not contacted');
    });

    it('maps NC → No contact (neutral)', () => {
        const r = resolveFollowResult('NC');
        expect(r.label).toBe('No contact');
        expect(r.bg).toBe('var(--paper-3)');
        expect(r.fg).toBe('var(--ink-3)');
    });

    it('maps BUSY → Busy signal (neutral)', () => {
        expect(resolveFollowResult('BUSY').label).toBe('Busy signal');
    });

    it('maps WN → Wrong number (warn)', () => {
        const r = resolveFollowResult('WN');
        expect(r.label).toBe('Wrong number');
        expect(r.bg).toBe('var(--warn-soft)');
        expect(r.fg).toBe('var(--warn-ink)');
    });

    it('maps RTP → Refused to pay (danger)', () => {
        const r = resolveFollowResult('RTP');
        expect(r.label).toBe('Refused to pay');
        expect(r.bg).toBe('var(--danger-soft)');
        expect(r.fg).toBe('var(--danger)');
    });

    it('maps REFUSED → Refused to pay (danger)', () => {
        expect(resolveFollowResult('REFUSED').label).toBe('Refused to pay');
    });

    it('maps PTP → Promise to pay (accent)', () => {
        const r = resolveFollowResult('PTP');
        expect(r.label).toBe('Promise to pay');
        expect(r.bg).toBe('var(--accent-soft)');
        expect(r.fg).toBe('var(--accent)');
    });

    it('maps BP → Broken promise (danger)', () => {
        expect(resolveFollowResult('BP').label).toBe('Broken promise');
    });

    it('maps BROKEN_PTP → Broken promise (danger)', () => {
        expect(resolveFollowResult('BROKEN_PTP').label).toBe('Broken promise');
    });

    it('maps PAID_PART → Partial payment (good)', () => {
        const r = resolveFollowResult('PAID_PART');
        expect(r.label).toBe('Partial payment');
        expect(r.bg).toBe('var(--good-soft)');
    });

    it('maps PAID_FULL → Paid in full (good, bold)', () => {
        const r = resolveFollowResult('PAID_FULL');
        expect(r.label).toBe('Paid in full');
        expect(r.bold).toBe(true);
    });

    it('maps DISPUTED → Disputed (warn)', () => {
        expect(resolveFollowResult('DISPUTED').label).toBe('Disputed');
    });

    it('maps UNREACHABLE → Unreachable (danger)', () => {
        expect(resolveFollowResult('UNREACHABLE').label).toBe('Unreachable');
    });

    it('is case-insensitive', () => {
        expect(resolveFollowResult('ptp').label).toBe('Promise to pay');
        expect(resolveFollowResult('Paid_Full').label).toBe('Paid in full');
    });

    it('falls back to raw value for unknown codes', () => {
        const r = resolveFollowResult('SOME_UNKNOWN');
        expect(r.label).toBe('SOME_UNKNOWN');
        expect(r.bg).toBe('var(--paper-3)');
    });

    it('handles non-zero numbers as unknown (shows raw)', () => {
        const r = resolveFollowResult(42);
        expect(r.label).toBe('42');
    });
});
