export interface LicenseConfig {
    startDate: number;
    durationDays: number;
}

export type LicenseStatus = 'none' | 'ok' | 'warning' | 'critical' | 'expired';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getLicenseDaysLeft(license?: LicenseConfig | null): number | null {
    if (!license) return null;
    const elapsed = Math.floor((Date.now() - license.startDate) / MS_PER_DAY);
    return license.durationDays - elapsed;
}

export function isLicenseExpired(license?: LicenseConfig | null): boolean {
    const days = getLicenseDaysLeft(license);
    if (days === null) return false;
    return days <= 0;
}

export function getLicenseStatus(license?: LicenseConfig | null): LicenseStatus {
    const days = getLicenseDaysLeft(license);
    if (days === null) return 'none';
    if (days <= 0) return 'expired';
    if (days <= 3) return 'critical';
    if (days <= 7) return 'warning';
    return 'ok';
}

export const LICENSE_PRESET_OPTIONS: { label: string; days: number }[] = [
    { label: '30 days', days: 30 },
    { label: '60 days', days: 60 },
    { label: '90 days', days: 90 },
    { label: '6 months', days: 180 },
    { label: '1 year', days: 365 },
];
