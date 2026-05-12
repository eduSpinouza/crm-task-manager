import { describe, it, expect } from 'vitest';
import {
    getLicenseDaysLeft,
    isLicenseExpired,
    getLicenseStatus,
    type LicenseConfig,
} from '../licenseUtils';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const makeLicense = (daysAgo: number, durationDays: number): LicenseConfig => ({
    startDate: Date.now() - daysAgo * MS_PER_DAY,
    durationDays,
});

describe('getLicenseDaysLeft', () => {
    it('returns null for undefined', () => {
        expect(getLicenseDaysLeft(undefined)).toBeNull();
    });

    it('returns null for null', () => {
        expect(getLicenseDaysLeft(null)).toBeNull();
    });

    it('returns full duration on day 0', () => {
        expect(getLicenseDaysLeft(makeLicense(0, 30))).toBe(30);
    });

    it('returns remaining days after partial elapsed', () => {
        expect(getLicenseDaysLeft(makeLicense(5, 30))).toBe(25);
    });

    it('returns 0 on the expiry day', () => {
        expect(getLicenseDaysLeft(makeLicense(30, 30))).toBe(0);
    });

    it('returns negative when past expiry', () => {
        expect(getLicenseDaysLeft(makeLicense(35, 30))).toBe(-5);
    });

    it('handles 180-day license', () => {
        expect(getLicenseDaysLeft(makeLicense(90, 180))).toBe(90);
    });

    it('handles 365-day license', () => {
        expect(getLicenseDaysLeft(makeLicense(100, 365))).toBe(265);
    });
});

describe('isLicenseExpired', () => {
    it('returns false for undefined', () => {
        expect(isLicenseExpired(undefined)).toBe(false);
    });

    it('returns false for null', () => {
        expect(isLicenseExpired(null)).toBe(false);
    });

    it('returns false when days remain', () => {
        expect(isLicenseExpired(makeLicense(10, 30))).toBe(false);
    });

    it('returns true when daysLeft is 0', () => {
        expect(isLicenseExpired(makeLicense(30, 30))).toBe(true);
    });

    it('returns true when past expiry', () => {
        expect(isLicenseExpired(makeLicense(40, 30))).toBe(true);
    });
});

describe('getLicenseStatus', () => {
    it('returns "none" for undefined', () => {
        expect(getLicenseStatus(undefined)).toBe('none');
    });

    it('returns "none" for null', () => {
        expect(getLicenseStatus(null)).toBe('none');
    });

    it('returns "ok" when more than 7 days left', () => {
        expect(getLicenseStatus(makeLicense(20, 30))).toBe('ok');
    });

    it('returns "warning" at exactly 7 days left', () => {
        expect(getLicenseStatus(makeLicense(23, 30))).toBe('warning');
    });

    it('returns "warning" at 4 days left', () => {
        expect(getLicenseStatus(makeLicense(26, 30))).toBe('warning');
    });

    it('returns "critical" at exactly 3 days left', () => {
        expect(getLicenseStatus(makeLicense(27, 30))).toBe('critical');
    });

    it('returns "critical" at 1 day left', () => {
        expect(getLicenseStatus(makeLicense(29, 30))).toBe('critical');
    });

    it('returns "expired" at 0 days left', () => {
        expect(getLicenseStatus(makeLicense(30, 30))).toBe('expired');
    });

    it('returns "expired" when well past expiry', () => {
        expect(getLicenseStatus(makeLicense(60, 30))).toBe('expired');
    });
});
