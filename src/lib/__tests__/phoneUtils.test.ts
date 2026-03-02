import { describe, it, expect } from 'vitest';
import {
    getCountryConfig,
    cleanPhoneNumber,
    COUNTRY_CONFIG,
    DEFAULT_COUNTRY_CODE,
    DEFAULT_MIN_LOCAL_LENGTH,
} from '../phoneUtils';

// ============================================================
// getCountryConfig
// ============================================================
describe('getCountryConfig', () => {
    it.each([
        ['https://mx-crm.certislink.com', '52', 10],
        ['https://pe-crm.certislink.com', '51', 9],
        ['https://co-crm.certislink.com', '57', 10],
        ['https://cl-crm.certislink.com', '56', 9],
    ])('%s → code %s, minLength %i', (url, expectedCode, expectedMin) => {
        const { countryCode, minLocalLength } = getCountryConfig(url);
        expect(countryCode).toBe(expectedCode);
        expect(minLocalLength).toBe(expectedMin);
    });

    it('falls back to Mexico defaults for unknown prefix', () => {
        const { countryCode, minLocalLength } = getCountryConfig('https://br-crm.certislink.com');
        expect(countryCode).toBe(DEFAULT_COUNTRY_CODE);
        expect(minLocalLength).toBe(DEFAULT_MIN_LOCAL_LENGTH);
    });

    it('falls back to Mexico defaults for invalid URL', () => {
        const { countryCode, minLocalLength } = getCountryConfig('not-a-url');
        expect(countryCode).toBe(DEFAULT_COUNTRY_CODE);
        expect(minLocalLength).toBe(DEFAULT_MIN_LOCAL_LENGTH);
    });

    it('falls back to Mexico defaults for empty string', () => {
        const { countryCode, minLocalLength } = getCountryConfig('');
        expect(countryCode).toBe(DEFAULT_COUNTRY_CODE);
        expect(minLocalLength).toBe(DEFAULT_MIN_LOCAL_LENGTH);
    });

    it('COUNTRY_CONFIG covers all four expected countries', () => {
        expect(Object.keys(COUNTRY_CONFIG)).toEqual(expect.arrayContaining(['mx', 'pe', 'co', 'cl']));
    });
});

// ============================================================
// cleanPhoneNumber — Mexico (code 52, minLength 10)
// ============================================================
describe('cleanPhoneNumber — Mexico', () => {
    const cc = '52';
    const min = 10;

    it('strips leading +52 from a full international number', () => {
        expect(cleanPhoneNumber('+521234567890', false, cc, min)).toBe('1234567890');
    });

    it('strips leading 52 (no plus) from a full international number', () => {
        expect(cleanPhoneNumber('521234567890', false, cc, min)).toBe('1234567890');
    });

    it('strips malformed repeated country code (52+521234567890)', () => {
        expect(cleanPhoneNumber('52+521234567890', false, cc, min)).toBe('1234567890');
    });

    it('does not over-strip when local number starts with same digits as country code', () => {
        // "521234" stripped would leave "1234" which is < 10 digits → keep as-is
        expect(cleanPhoneNumber('521234', false, cc, min)).toBe('521234');
    });

    it('strips non-digit characters', () => {
        expect(cleanPhoneNumber('+52 123-456-7890', false, cc, min)).toBe('1234567890');
    });

    it('keepCountryCode=true prepends +52', () => {
        expect(cleanPhoneNumber('1234567890', true, cc, min)).toBe('+521234567890');
    });

    it('keepCountryCode=true strips then re-adds country code', () => {
        expect(cleanPhoneNumber('+521234567890', true, cc, min)).toBe('+521234567890');
    });

    it('returns empty string for empty input', () => {
        expect(cleanPhoneNumber('', false, cc, min)).toBe('');
    });
});

// ============================================================
// cleanPhoneNumber — Peru (code 51, minLength 9)
// ============================================================
describe('cleanPhoneNumber — Peru', () => {
    const cc = '51';
    const min = 9;

    it('strips +51 from a 9-digit mobile number', () => {
        expect(cleanPhoneNumber('+51987654321', false, cc, min)).toBe('987654321');
    });

    it('strips 51 (no plus) from a 9-digit number', () => {
        expect(cleanPhoneNumber('51987654321', false, cc, min)).toBe('987654321');
    });

    it('does not over-strip 9-digit number that starts with 51', () => {
        // "519876543" stripped of 51 → "9876543" = 7 digits < 9 → keep
        expect(cleanPhoneNumber('519876543', false, cc, min)).toBe('519876543');
    });

    it('keepCountryCode=true adds +51 prefix', () => {
        expect(cleanPhoneNumber('987654321', true, cc, min)).toBe('+51987654321');
    });
});

// ============================================================
// cleanPhoneNumber — Colombia (code 57, minLength 10)
// ============================================================
describe('cleanPhoneNumber — Colombia', () => {
    const cc = '57';
    const min = 10;

    it('strips +57 from a 10-digit number', () => {
        expect(cleanPhoneNumber('+573001234567', false, cc, min)).toBe('3001234567');
    });

    it('strips 57 (no plus) from a 10-digit number', () => {
        expect(cleanPhoneNumber('573001234567', false, cc, min)).toBe('3001234567');
    });

    it('does not over-strip when result would be under 10 digits', () => {
        expect(cleanPhoneNumber('5712345678', false, cc, min)).toBe('5712345678');
    });

    it('keepCountryCode=true adds +57 prefix', () => {
        expect(cleanPhoneNumber('3001234567', true, cc, min)).toBe('+573001234567');
    });
});

// ============================================================
// cleanPhoneNumber — Chile (code 56, minLength 9)
// ============================================================
describe('cleanPhoneNumber — Chile', () => {
    const cc = '56';
    const min = 9;

    it('strips +56 from a 9-digit mobile number', () => {
        expect(cleanPhoneNumber('+56912345678', false, cc, min)).toBe('912345678');
    });

    it('strips 56 (no plus) from a 9-digit number', () => {
        expect(cleanPhoneNumber('56912345678', false, cc, min)).toBe('912345678');
    });

    it('does not over-strip 9-digit number that starts with 56', () => {
        expect(cleanPhoneNumber('561234567', false, cc, min)).toBe('561234567');
    });

    it('keepCountryCode=true adds +56 prefix', () => {
        expect(cleanPhoneNumber('912345678', true, cc, min)).toBe('+56912345678');
    });
});

// ============================================================
// cleanPhoneNumber — defaults (no country args)
// ============================================================
describe('cleanPhoneNumber — defaults', () => {
    it('uses Mexico (52) and minLength 10 when no country args supplied', () => {
        expect(cleanPhoneNumber('+521234567890')).toBe('1234567890');
    });

    it('returns empty string for falsy input', () => {
        expect(cleanPhoneNumber('')).toBe('');
    });
});
