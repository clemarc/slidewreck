import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MastraClient, MastraApiError } from '../lib/mastra-client';

describe('MastraClient', () => {
  let client: MastraClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    client = new MastraClient('http://localhost:4111');
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('uses provided base URL', () => {
      const c = new MastraClient('http://custom:9999');
      expect(c.baseUrl).toBe('http://custom:9999');
    });

    it('defaults to http://localhost:4111', () => {
      const c = new MastraClient();
      expect(c.baseUrl).toBe('http://localhost:4111');
    });

    it('strips trailing slash from base URL', () => {
      const c = new MastraClient('http://localhost:4111/');
      expect(c.baseUrl).toBe('http://localhost:4111');
    });
  });

  describe('triggerWorkflow', () => {
    it('calls create-run then start-async and returns runId', async () => {
      // Mock create-run response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: 'run-123' }),
      });
      // Mock start-async response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running' }),
      });

      const result = await client.triggerWorkflow('slidewreck', {
        topic: 'Test Topic',
        audienceLevel: 'intermediate',
        format: 'standard',
      });

      // First call: create-run
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:4111/api/workflows/slidewreck/create-run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      // Second call: start-async with runId query param
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:4111/api/workflows/slidewreck/start-async?runId=run-123',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputData: {
              topic: 'Test Topic',
              audienceLevel: 'intermediate',
              format: 'standard',
            },
          }),
        },
      );
      expect(result).toEqual({ runId: 'run-123' });
    });

    it('throws MastraApiError when create-run fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid input',
      });

      await expect(
        client.triggerWorkflow('slidewreck', {
          topic: 'Test',
          audienceLevel: 'beginner',
          format: 'lightning',
        }),
      ).rejects.toThrow(MastraApiError);
    });

    it('throws MastraApiError when start-async fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: 'run-456' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Workflow failed to start',
      });

      await expect(
        client.triggerWorkflow('slidewreck', {
          topic: 'Test',
          audienceLevel: 'beginner',
          format: 'lightning',
        }),
      ).rejects.toThrow(MastraApiError);
    });
  });

  describe('getRunStatus', () => {
    it('sends GET to /api/workflows/:id/runs/:runId', async () => {
      const mockRun = {
        runId: 'run-123',
        status: 'running',
        createdAt: '2026-03-16T00:00:00Z',
        updatedAt: '2026-03-16T00:00:00Z',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRun,
      });

      const result = await client.getRunStatus('slidewreck', 'run-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/runs/run-123',
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      );
      expect(result.status).toBe('running');
      expect(result.runId).toBe('run-123');
    });

    it('throws MastraApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Run not found',
      });

      await expect(client.getRunStatus('slidewreck', 'bad-id')).rejects.toThrow(MastraApiError);
    });
  });

  describe('resumeStep', () => {
    it('sends POST to /api/workflows/:id/resume-async with step and resumeData', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Resumed' }),
      });

      await client.resumeStep('slidewreck', 'run-123', 'review-research', {
        decision: 'approved',
        feedback: 'Looks good',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/resume-async',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'run-123',
            step: 'review-research',
            resumeData: { decision: 'approved', feedback: 'Looks good' },
          }),
        },
      );
    });

    it('throws MastraApiError on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Something went wrong',
      });

      await expect(
        client.resumeStep('slidewreck', 'run-123', 'step-1', {}),
      ).rejects.toThrow(MastraApiError);
    });
  });

  describe('MastraApiError', () => {
    it('has statusCode and message properties', () => {
      const err = new MastraApiError(422, 'Validation failed');
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe('Validation failed');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
