import { describe, it, expect, afterEach } from 'vitest';
import { getBrowser, closeBrowser } from '../browser';
import { hasChromium } from '../../__tests__/has-chromium';

afterEach(async () => {
  await closeBrowser();
});

describe.skipIf(!hasChromium)('browser singleton', () => {
  it('getBrowser returns a connected browser', async () => {
    const browser = await getBrowser();
    expect(browser.connected).toBe(true);
  });

  it('getBrowser returns the same instance on second call', async () => {
    const first = await getBrowser();
    const second = await getBrowser();
    expect(first).toBe(second);
  });

  it('closeBrowser disconnects and clears instance', async () => {
    const browser = await getBrowser();
    expect(browser.connected).toBe(true);
    await closeBrowser();
    expect(browser.connected).toBe(false);
  });

  it('getBrowser creates new instance after closeBrowser', async () => {
    const first = await getBrowser();
    await closeBrowser();
    const second = await getBrowser();
    expect(second).not.toBe(first);
    expect(second.connected).toBe(true);
  });

  it('closeBrowser is safe to call when no browser exists', async () => {
    // Should not throw
    await closeBrowser();
    await closeBrowser();
  });
});
