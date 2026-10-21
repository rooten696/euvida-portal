import type { Article } from '@/lib/articleTypes';
import { resolveArticleVideo } from '@/lib/articleVideo';
import ArticleVideoPlayer from './ArticleVideoPlayer';

type ArticleVideoProps = {
  article: Article | null | undefined;
  locale: string;
};

/**
 * Server component that resolves the locale-aware YouTube video on the server.
 * Only if a valid embeddable video exists, it renders the interactive client player,
 * passing ONLY the lightweight resolved video object (avoiding serialization of the full article).
 */
export default function ArticleVideo({ article, locale }: ArticleVideoProps) {
  const video = resolveArticleVideo(article, locale);
  if (!video) {
    return null;
  }

  return <ArticleVideoPlayer video={video} locale={locale} />;
}
