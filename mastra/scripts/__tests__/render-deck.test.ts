import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const cliPath = resolve(__dirname, '../render-deck.ts');
const fixturePath = resolve(__dirname, 'fixtures/sample-deck.json');

function runCli(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx ${cliPath} ${args}`, {
      encoding: 'utf-8',
      timeout: 30_000,
      cwd: resolve(__dirname, '../..'),
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status || 1,
    };
  }
}

describe('render-deck CLI', () => {
  it('exits with error when no file argument provided', () => {
    const result = runCli('');
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Usage:');
  }, 30_000);

  it('exits with error for non-existent file', () => {
    const result = runCli('/tmp/nonexistent-deck.json');
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('not found');
  }, 30_000);

  it('exits with error for invalid JSON', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'render-deck-'));
    const badFile = join(tmpDir, 'bad.json');
    writeFileSync(badFile, '{ not valid json }');
    const result = runCli(badFile);
    expect(result.exitCode).not.toBe(0);
  }, 30_000);

  it('produces a PDF file from valid DeckSpec JSON', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'render-deck-'));
    const inputFile = join(tmpDir, 'deck-spec.json');
    // Copy fixture to temp dir
    writeFileSync(inputFile, readFileSync(fixturePath, 'utf-8'));

    const result = runCli(inputFile);
    expect(result.exitCode).toBe(0);

    const pdfPath = join(tmpDir, 'deck-spec.pdf');
    expect(existsSync(pdfPath)).toBe(true);

    const pdfContent = readFileSync(pdfPath);
    expect(pdfContent.length).toBeGreaterThan(1000);
    expect(pdfContent.slice(0, 5).toString()).toBe('%PDF-');
  }, 60_000);
});
