import { getDictionary } from "@/i18n/dictionaries";

export default function Home() {
  const t = getDictionary();

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-zinc-950">
      <div className="flex max-w-xl flex-col items-center gap-5">
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t.app.tagline}
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          {t.home.title}
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {t.home.subtitle}
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          {t.home.status}
        </p>
      </div>
    </main>
  );
}
