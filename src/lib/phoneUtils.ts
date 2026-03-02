// Infer dialing code and minimum local number length from the CRM base URL prefix
// (e.g. "mx-crm.certislink.com" → country code "52", min local length 10)
export const COUNTRY_CONFIG: Record<string, { code: string; minLength: number }> = {
    mx: { code: '52', minLength: 10 }, // Mexico:   always 10 digits
    pe: { code: '51', minLength: 9  }, // Peru:     9 digits (mobile); 8 (landline)
    co: { code: '57', minLength: 10 }, // Colombia: always 10 digits (standardised 2021)
    cl: { code: '56', minLength: 9  }, // Chile:    always 9 digits
};

export const DEFAULT_COUNTRY_CODE = '52';
export const DEFAULT_MIN_LOCAL_LENGTH = 10;

export function getCountryConfig(baseUrl: string): { countryCode: string; minLocalLength: number } {
    try {
        const hostname = new URL(baseUrl).hostname; // e.g. "mx-crm.certislink.com"
        const prefix = hostname.split('-')[0];       // e.g. "mx"
        const cfg = COUNTRY_CONFIG[prefix];
        return cfg
            ? { countryCode: cfg.code, minLocalLength: cfg.minLength }
            : { countryCode: DEFAULT_COUNTRY_CODE, minLocalLength: DEFAULT_MIN_LOCAL_LENGTH };
    } catch {
        return { countryCode: DEFAULT_COUNTRY_CODE, minLocalLength: DEFAULT_MIN_LOCAL_LENGTH };
    }
}

export function cleanPhoneNumber(
    phone: string,
    keepCountryCode: boolean = false,
    countryCode: string = DEFAULT_COUNTRY_CODE,
    minLocalLength: number = DEFAULT_MIN_LOCAL_LENGTH,
): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, ''); // Keep only digits and '+'

    // Repeatedly strip the country code if it appears at the beginning,
    // accounting for optional misplaced '+' signs (e.g., 52+52...)
    const prefixRegex = new RegExp(`^\\+?${countryCode}\\+?`);

    while (cleaned.match(prefixRegex)) {
        const nextCleaned = cleaned.replace(prefixRegex, '');
        // Safety check: if stripping the prefix leaves the number shorter than the
        // country's minimum local length, the country-code digits are actually part
        // of the local number itself. Stop stripping.
        if (nextCleaned.replace(/\+/g, '').length < minLocalLength) {
            break;
        }
        cleaned = nextCleaned;
    }

    // Strip any remaining '+' signs before returning the base local number
    cleaned = cleaned.replace(/\+/g, '');

    // If we need to keep the country code, prepend it with a '+'
    if (keepCountryCode) {
        return `+${countryCode}${cleaned}`;
    }

    return cleaned;
}
