import type { LegalPageContent } from '@/lib/legalPages';

type LegalPageProps = {
  content: LegalPageContent;
};

export default function LegalPage({ content }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-black/20 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">
          EUVIDA.eu
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          {content.intro}
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Aktualizováno: {content.updated}
        </p>

        <div className="mt-10 space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-black text-white">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300 sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
