import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';

type DestinationMarkdownSectionProps = {
  title: string;
  content?: string | null;
  tone?: 'blue' | 'green' | 'orange' | 'slate';
};

const toneClasses = {
  blue: 'border-blue-100 bg-blue-50/70 text-blue-950',
  green: 'border-green-100 bg-green-50/70 text-green-950',
  orange: 'border-orange-100 bg-orange-50/70 text-orange-950',
  slate: 'border-slate-200 bg-white text-slate-950',
};

const markdownComponents = {
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-4 text-sm leading-relaxed text-slate-700" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-bold text-slate-950" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-4 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-700" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => <li {...props} />,
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a className="font-semibold text-blue-800 underline decoration-blue-200 underline-offset-2" {...props} />
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
