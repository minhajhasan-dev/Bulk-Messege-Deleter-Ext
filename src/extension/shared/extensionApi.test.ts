import { describe, it, expect } from 'vitest';
import { isExtensionEnv, onMessageAdd, onMessageRemove, sendMessage } from './extensionApi';

describe('extensionApi wrapper', () => {
  it('does not throw when chrome is undefined', async () => {
    // Ensure chrome is undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).chrome;

    expect(isExtensionEnv()).toBe(false);

    const fn = () => {};
    expect(() => onMessageAdd(fn)).not.toThrow();
    expect(() => onMessageRemove(fn)).not.toThrow();

    await expect(sendMessage({ type: 'getState' })).resolves.toBeTypeOf('object');
  });
});
