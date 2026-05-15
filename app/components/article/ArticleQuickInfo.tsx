import type { VisitInfo } from '@/lib/articleTypes';
import QuickOverview from './QuickOverview';

type ArticleQuickInfoProps = {
  locale: string;
  visitInfo?: VisitInfo | null;
};

export default function ArticleQuickInfo({ locale, visitInfo }: ArticleQuickInfoProps) {
  return <QuickOverview locale={locale} article={{ visit_info: visitInfo }} />;
}
