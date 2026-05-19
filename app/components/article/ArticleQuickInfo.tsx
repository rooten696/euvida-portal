import type { PracticalInfoLocales, VisitInfo } from '@/lib/articleTypes';
import QuickOverview from './QuickOverview';

type ArticleQuickInfoProps = {
  locale: string;
  visitInfo?: VisitInfo | null;
  practicalInfo?: PracticalInfoLocales | null;
};

export default function ArticleQuickInfo({
  locale,
  visitInfo,
  practicalInfo,
}: ArticleQuickInfoProps) {
  return (
    <QuickOverview
      locale={locale}
      article={{ visit_info: visitInfo, practical_info: practicalInfo }}
    />
  );
}
