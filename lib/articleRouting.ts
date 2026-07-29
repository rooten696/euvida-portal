type ArticleHrefInput = {
  slug: string;
};

export function getArticleHref(article: ArticleHrefInput, locale: string): string {
  return `/${locale}/article/${article.slug}`;
}
