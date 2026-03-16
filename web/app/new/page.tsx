'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowInputSchema } from 'bmad-mastra-presentation/src/mastra/schemas/workflow-input';
import { MastraClient, MastraApiError } from '@/lib/mastra-client';

const AUDIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'mixed'] as const;
const TALK_FORMATS = ['lightning', 'standard', 'keynote'] as const;

export default function NewTalkPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [audienceLevel, setAudienceLevel] = useState<string>('intermediate');
  const [format, setFormat] = useState<string>('standard');
  const [constraints, setConstraints] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setApiError('');

    const input: Record<string, unknown> = {
      topic,
      audienceLevel,
      format,
    };
    if (constraints.trim()) {
      input.constraints = constraints.trim();
    }

    const result = WorkflowInputSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const client = new MastraClient();
      const { runId } = await client.triggerWorkflow('slidewreck', result.data);
      router.push(`/run/${runId}`);
    } catch (err) {
      if (err instanceof MastraApiError) {
        setApiError(`API error (${err.statusCode}): ${err.message}`);
      } else {
        setApiError('Failed to start workflow. Is the Mastra server running?');
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Create a Talk</h1>
      <p className="mt-2 text-sm text-gray-500">
        Fill in the details below to start generating your conference talk.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
            Topic
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Building Resilient Microservices"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          {errors.topic && <p className="mt-1 text-sm text-red-600">{errors.topic}</p>}
        </div>

        <div>
          <label htmlFor="audienceLevel" className="block text-sm font-medium text-gray-700">
            Audience Level
          </label>
          <select
            id="audienceLevel"
            value={audienceLevel}
            onChange={(e) => setAudienceLevel(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            {AUDIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
          {errors.audienceLevel && (
            <p className="mt-1 text-sm text-red-600">{errors.audienceLevel}</p>
          )}
        </div>

        <div>
          <label htmlFor="format" className="block text-sm font-medium text-gray-700">
            Talk Format
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            {TALK_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f === 'lightning'
                  ? 'Lightning (5-10 min)'
                  : f === 'standard'
                    ? 'Standard (25-45 min)'
                    : 'Keynote (45-60 min)'}
              </option>
            ))}
          </select>
          {errors.format && <p className="mt-1 text-sm text-red-600">{errors.format}</p>}
        </div>

        <div>
          <label htmlFor="constraints" className="block text-sm font-medium text-gray-700">
            Constraints{' '}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="constraints"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            rows={3}
            placeholder="e.g. Focus on observability, avoid Kubernetes"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          {errors.constraints && (
            <p className="mt-1 text-sm text-red-600">{errors.constraints}</p>
          )}
        </div>

        {apiError && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Starting...' : 'Generate Talk'}
        </button>
      </form>
    </main>
  );
}
