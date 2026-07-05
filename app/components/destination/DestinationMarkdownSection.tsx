import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';

type DestinationMarkdownSectionProps = {
  title: string;
  content?: string | null;
  tone?: 'blue' | 'green' | 'orange' | 'slate';
};

const toneClasses = {
  blue: 'border-white/10 bg-blue-950/20 text-blue-100',
  green: 'border-white/10 bg-emerald-950/20 text-emerald-100',
  orange: 'border-white/10 bg-orange-950/20 text-orange-100',
  slate: 'border-white/10 bg-slate-900/60 text-slate-100 backdrop-blur',
};

const markdownComponents = {
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-4 text-sm leading-relaxed text-slate-300" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-bold text-white" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-4 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-300" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-300" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => <li {...props} />,
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a className="font-semibold text-emerald-400 underline decoration-emerald-500/50 underline-offset-2 hover:text-emerald-300" {...props} />
  ),
};

export default function DestinationMarkdownSection({
  title,
  content,
  tone = 'slate',
}: DestinationMarkdownSectionProps) {
  if (!content) {
    return null;
  }

  return (
    <section className={`rounded-2xl border p-6 shadow-sm ${toneClasses[tone]}`}>
      <h2 className="mb-4 text-xl font-extrabold">{title}</h2>
      <ReactMarkdown components={markdownComponents} skipHtml>
        {content}
      </ReactMarkdown>
    </section>
  );
}
