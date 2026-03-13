import { existsSync } from 'fs';
import puppeteer from 'puppeteer';

/**
 * Lightweight Chromium availability check — verifies the binary exists
 * without launching a full browser instance at module load time.
 */
export const hasChromium = existsSync(puppeteer.executablePath());
