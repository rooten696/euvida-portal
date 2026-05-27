'use client';

import ArticleCategoryExplorer from '@/app/components/article/ArticleCategoryExplorer';
import type { ArticleCardData } from '@/lib/articleCards';

type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

type HomeArticleExplorerProps = {
  locale: string;
  articles: ArticleCardData[];
  categories: FilterOption[];
  defaultVisibleCount?: number;
};

export default function HomeArticleExplorer({
  locale,
  articles,
  categories,
  defaultVisibleCount,
}: HomeArticleExplorerProps) {
  return (
    <ArticleCategoryExplorer
      locale={locale}
      articles={articles}
      categories={categories}
      defaultVisibleCount={defaultVisibleCount}
      showFeaturedBadges={false}
    />
  );
}
