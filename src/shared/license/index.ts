import { addDays, now } from '@/shared/utils/date';

export type LicenseStatus = 'trial' | 'expired' | 'licensed';

const STORAGE_KEYS = {
  installAt: 'license.installAt',
  licensed: 'license.licensed',
  trialDays: 'license.trialDays',
} as const;

export const DEFAULT_TRIAL_DAYS = 7;

export async function getFromStorage<T = unknown>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] as T);
    });
  });
}

export async function setInStorage<T = unknown>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

export async function ensureTrialInitialized(): Promise<void> {
  const existing = await getFromStorage<number>(STORAGE_KEYS.installAt);
  if (!existing) {
    await setInStorage(STORAGE_KEYS.installAt, Date.now());
  }
}

export async function getLicenseStatus(): Promise<{ status: LicenseStatus; daysLeft?: number }> {
  const [licensed, installAt, trialDays] = await Promise.all([
    getFromStorage<boolean>(STORAGE_KEYS.licensed),
    getFromStorage<number>(STORAGE_KEYS.installAt),
    getFromStorage<number>(STORAGE_KEYS.trialDays),
  ]);

  if (licensed) return { status: 'licensed' };

  const started = installAt ? new Date(installAt) : now();
  const days = trialDays ?? DEFAULT_TRIAL_DAYS;
  const expiresAt = addDays(started, days);
  const msLeft = +expiresAt - +now();
  if (msLeft <= 0) return { status: 'expired', daysLeft: 0 };
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  return { status: 'trial', daysLeft };
}

export async function markLicensed(value: boolean): Promise<void> {
  await setInStorage(STORAGE_KEYS.licensed, value);
}

export async function setTrialDays(days: number): Promise<void> {
  await setInStorage(STORAGE_KEYS.trialDays, days);
}
