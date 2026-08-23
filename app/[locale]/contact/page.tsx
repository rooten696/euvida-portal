import LegalPage from '@/app/components/LegalPage';
import { getLegalLocale, legalPages } from '@/lib/legalPages';
import { supportedLocales } from '@/lib/articleTypes';
import { setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export const revalidate = 86400;

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getLegalLocale(rawLocale);
  setRequestLocale(locale);

  return <LegalPage content={legalPages[locale].contact} />;
}
