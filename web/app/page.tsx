import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">TalkForge</h1>
      <p className="mt-4 text-lg text-gray-600">
        AI-powered conference talk generator. Create research briefs, narrative outlines, speaker
        scripts, and slide specifications from a single topic.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/new"
          className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
        >
          Create a Talk
        </Link>
        <Link
          href="/history"
          className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Run History
        </Link>
      </div>
    </main>
  );
}
