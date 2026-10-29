'use client';

import { useSyncExternalStore } from 'react';
import { hasVideoConsent, openCookieSettings, subscribeCookiePreferences } from '@/lib/cookie-consent';
import {
  getFallbackBadgeText,
  getLanguageDisplayName,
  getVideoUiLabels,
  type ResolvedVideo,
} from '@/lib/articleVideo';

type ArticleVideoPlayerProps = {
  video: ResolvedVideo;
  locale: string;
};

export default function ArticleVideoPlayer({ video, locale }: ArticleVideoPlayerProps) {
  const videoKey = `${video.requestedLocale}-${video.videoId}`;
  // No provider contact during SSR or before an explicit video grant.
  const isPlaying = useSyncExternalStore(subscribeCookiePreferences, hasVideoConsent, () => false);

  const labels = getVideoUiLabels(locale);
  const audioLangName = video.audioLanguage
    ? getLanguageDisplayName(locale, video.audioLanguage)
    : null;

  return (
    <section
      aria-labelledby="article-video-title"
      className="article-video-block rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur md:p-8"
      key={videoKey}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-red-500 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            <h2 id="article-video-title" className="text-xl font-bold text-white">
              {labels.sectionTitle}
            </h2>
          </div>
          {video.title && (
            <p className="text-sm font-medium text-slate-200">
              {video.title}
              {video.channel && (
                <span className="text-slate-400"> • {video.channel}</span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {video.isFallback && (
            <span
              data-testid="video-fallback-badge"
              className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300 border border-amber-500/30"
            >
              {getFallbackBadgeText(locale, video.audioLanguage || video.resolvedLocale)}
            </span>
          )}

          {audioLangName && (
            <span
              data-testid="video-audio-badge"
              className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 border border-white/10"
            >
              {labels.audioLanguageLabel}: {audioLangName}
            </span>
          )}

          {video.hasSubtitles && (
            <span
              data-testid="video-subtitles-badge"
              className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-white/10"
            >
              {labels.subtitlesAvailable}
            </span>
          )}
        </div>
      </div>

      <div

        tabIndex={-1}
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 border border-white/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
      >
        {!isPlaying ? (
          <div
            data-testid="video-click-to-load"
            className="flex h-full w-full flex-col items-center justify-center p-6 text-center select-none"
          >
            <button
              type="button"
              data-testid="video-play-button"
              onClick={openCookieSettings}
              aria-describedby="video-privacy-notice"
              aria-label={`${labels.consentButton}${video.title ? `: ${video.title}` : ''}`}
              className="group relative flex flex-col items-center gap-4 rounded-xl p-4 transition-transform motion-safe:hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-950/50 transition-colors group-hover:bg-red-500 md:h-20 md:w-20">
                <svg
                  className="ml-1 h-8 w-8 text-white md:h-10 md:w-10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>

              <span className="rounded-lg bg-slate-900/90 px-4 py-1.5 text-sm font-semibold text-white border border-white/10 shadow">
                {labels.consentButton}
              </span>
            </button>

            <div
              id="video-privacy-notice"
              className="mt-4 max-w-md text-xs text-slate-300"
            >
              <p>{labels.privacyNotice}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {labels.externalProviderNotice}
              </p>
            </div>
          </div>
        ) : (
          <iframe
            key={videoKey}
            data-testid="video-iframe"
            src={video.embedUrl}
            title={video.title || labels.sectionTitle}
            className="h-full w-full rounded-xl border-0"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>

      {video.qualityNote && (
        <p className="mt-3 text-xs italic text-slate-400">
          {video.qualityNote}
        </p>
      )}
    </section>
  );
}
