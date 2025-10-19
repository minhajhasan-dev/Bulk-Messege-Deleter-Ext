type TelemetryEvent = { event: string; props?: Record<string, unknown> };

const STORAGE_KEY = 'telemetry.optIn';

let optedIn = false;

export async function initTelemetry(): Promise<void> {
  optedIn = await new Promise<boolean>((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      resolve(Boolean(res[STORAGE_KEY]));
    });
  });
}

export async function setOptIn(value: boolean): Promise<void> {
  optedIn = value;
  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: value }, () => resolve());
  });
}

export function getOptIn(): boolean {
  return optedIn;
}

export async function track(evt: TelemetryEvent): Promise<void> {
  if (!optedIn) return;
  // In production, send to your telemetry endpoint
  // This is a stub implementation
  // eslint-disable-next-line no-console
  console.log('[telemetry]', evt.event, evt.props ?? {});
}
