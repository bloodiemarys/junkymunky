"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center font-sans">
        <p className="text-7xl font-extrabold text-red-200">!</p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900">
          Something went wrong
        </h2>
        <p className="mt-3 max-w-sm text-zinc-500">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center rounded-lg bg-[#2E8B3C] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#256e30]"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center rounded-lg border border-zinc-200 px-6 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Return home
          </a>
        </div>
      </body>
    </html>
  );
}
