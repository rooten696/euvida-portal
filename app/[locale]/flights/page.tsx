import { permanentRedirect } from 'next/navigation';
import { normalizeLocale } from '@/lib/articleLocalization';
import { supportedLocales } from '@/lib/articleTypes';

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

type FlightsRedirectProps = {
  params: Promise<{ locale: string }>;
};

export default async function FlightsRedirectPage({ params }: FlightsRedirectProps) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  permanentRedirect(`/${locale}/letenky`);
}
