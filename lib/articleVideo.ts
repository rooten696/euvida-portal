import {
  type Article,
  type ArticleVideos,
  type SupportedLocale,
} from './articleTypes';
import { normalizeLocale } from './articleLocalization';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * Extracts and strictly validates an 11-character YouTube video ID.
 * Accepts either a raw 11-character ID or a full YouTube URL from allowed domains.
 * Returns the valid ID or null if invalid or unsafe (fails closed).
 */
export function extractValidYouTubeId(input: unknown): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Direct 11-character ID
  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Attempt URL parsing
  let url: URL;
  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
    const urlString = hasScheme ? trimmed : `https://${trimmed}`;
    url = new URL(urlString);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (!ALLOWED_YOUTUBE_HOSTS.has(hostname)) {
    return null;
  }

  let candidateId: string | null = null;

  if (hostname === 'youtu.be') {
    // Short URL path: /ID
    const pathPart = url.pathname.replace(/^\/+/, '').split('/')[0];
    if (pathPart) {
      candidateId = pathPart;
    }
  } else {
    if (url.pathname === '/watch') {
      candidateId = url.searchParams.get('v');
    } else if (url.pathname.startsWith('/embed/')) {
      candidateId = url.pathname.slice('/embed/'.length).split('/')[0] || null;
    } else if (url.pathname.startsWith('/v/')) {
      candidateId = url.pathname.slice('/v/'.length).split('/')[0] || null;
    } else if (url.pathname.startsWith('/shorts/')) {
      candidateId = url.pathname.slice('/shorts/'.length).split('/')[0] || null;
    }
  }

  if (candidateId && YOUTUBE_ID_REGEX.test(candidateId)) {
    return candidateId;
  }

  return null;
}

/**
 * Constructs a strict youtube-nocookie.com embed URL without autoplay.
 * Requires a strictly validated 11-character video ID.
 */
export function buildYouTubeEmbedUrl(videoId: string): string {
  if (!videoId || typeof videoId !== 'string' || !YOUTUBE_ID_REGEX.test(videoId)) {
    throw new Error(`Invalid YouTube video ID: ${videoId}`);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

/**
 * Deterministic fallback order per specification:
 * For locale L: L -> en -> cs (without duplicates).
 * Example:
 * cs -> ['cs', 'en']
 * en -> ['en', 'cs']
 * de -> ['de', 'en', 'cs']
 * fr -> ['fr', 'en', 'cs']
 * es -> ['es', 'en', 'cs']
 */
export function getFallbackLocaleChain(locale: string): SupportedLocale[] {
  const norm = normalizeLocale(locale);
  const chain: SupportedLocale[] = [];

  const add = (loc: SupportedLocale) => {
    if (!chain.includes(loc)) {
      chain.push(loc);
    }
  };

  add(norm);
  add('en');
  add('cs');

  return chain;
}

export type ResolvedVideo = {
  videoId: string;
  embedUrl: string;
  title: string | null;
  channel: string | null;
  requestedLocale: SupportedLocale;
  resolvedLocale: SupportedLocale;
  isFallback: boolean;
  audioLanguage: string | null;
  hasSubtitles: boolean;
  qualityNote: string | null;
};

/**
 * Extracts the video dictionary strictly from article data `source_info.videos`.
 */
export function getArticleVideosMap(
  article: Article | null | undefined
): ArticleVideos | null {
  if (!article || typeof article !== 'object') return null;

  const candidate = article.source_info?.videos;

  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    return candidate as ArticleVideos;
  }

  return null;
}

/**
 * Resolves the appropriate YouTube video for an article and locale,
 * applying the deterministic L -> en -> cs fallback.
 * Strictly validates data types from JSONB and fails closed to null on any error.
 */
export function resolveArticleVideo(
  article: Article | null | undefined,
  locale: string
): ResolvedVideo | null {
  try {
    const videosMap = getArticleVideosMap(article);
    if (!videosMap || typeof videosMap !== 'object') {
      return null;
    }

    const requestedLocale = normalizeLocale(locale);
    const chain = getFallbackLocaleChain(requestedLocale);

    for (const candLocale of chain) {
      const item = videosMap[candLocale];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }

      // Disallow explicitly disabled embeds
      if (item.embed_allowed === false || (item.embed_allowed as unknown) === 'false') {
        continue;
      }

      const rawInput = typeof item.video_id === 'string'
        ? item.video_id
        : typeof item.url === 'string'
        ? item.url
        : null;

      const videoId = extractValidYouTubeId(rawInput);
      if (!videoId) {
        continue;
      }

      const isFallback = candLocale !== requestedLocale;

      // Only record audio language if explicitly provided as a string
      const audioLanguage = typeof item.audio_language === 'string' && item.audio_language.trim()
        ? item.audio_language.trim().toLowerCase().split(/[-_]/)[0]
        : null;

      const hasSubtitles = item.has_subtitles === true || (item.has_subtitles as unknown) === 'true';

      const title = typeof item.title === 'string' && item.title.trim()
        ? item.title.trim()
        : null;

      const channel = typeof item.channel === 'string' && item.channel.trim()
        ? item.channel.trim()
        : null;

      const qualityNote = typeof item.quality_note === 'string' && item.quality_note.trim()
        ? item.quality_note.trim()
        : null;

      return {
        videoId,
        embedUrl: buildYouTubeEmbedUrl(videoId),
        title,
        channel,
        requestedLocale,
        resolvedLocale: candLocale,
        isFallback,
        audioLanguage,
        hasSubtitles,
        qualityNote,
      };
    }

    return null;
  } catch {
    // Fail closed: never crash article rendering on corrupted video metadata
    return null;
  }
}

/* ============================================================================
   Localization strings for video UI
============================================================================ */

export type VideoUiLabels = {
  sectionTitle: string;
  playButton: string;
  privacyNotice: string;
  audioLanguageLabel: string;
  subtitlesAvailable: string;
  externalProviderNotice: string;
};

const LANGUAGE_NAMES: Record<SupportedLocale, Record<string, string>> = {
  cs: {
    cs: 'čeština',
    en: 'angličtina',
    de: 'němčina',
    fr: 'francouzština',
    es: 'španělština',
  },
  en: {
    cs: 'Czech',
    en: 'English',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
  },
  de: {
    cs: 'Tschechisch',
    en: 'Englisch',
    de: 'Deutsch',
    fr: 'Französisch',
    es: 'Spanisch',
  },
  fr: {
    cs: 'tchèque',
    en: 'anglais',
    de: 'allemand',
    fr: 'français',
    es: 'espagnol',
  },
  es: {
    cs: 'checo',
    en: 'inglés',
    de: 'alemán',
    fr: 'francés',
    es: 'español',
  },
};

export const VIDEO_UI_LABELS: Record<SupportedLocale, VideoUiLabels> = {
  cs: {
    sectionTitle: 'Video z bikeparku',
    playButton: 'Přehrát video',
    privacyNotice: 'Přehráním se načte video ze služby YouTube (youtube-nocookie.com). Dojde ke kontaktu serverů Google a může dojít k ukládání dat.',
    audioLanguageLabel: 'Jazyk audia',
    subtitlesAvailable: 'Titulky',
    externalProviderNotice: 'Poskytovatel: YouTube / Google LLC (youtube-nocookie.com)',
  },
  en: {
    sectionTitle: 'Bikepark video',
    playButton: 'Play video',
    privacyNotice: 'Playing loads video from YouTube (youtube-nocookie.com). Google servers are contacted and may store data.',
    audioLanguageLabel: 'Audio language',
    subtitlesAvailable: 'Subtitles',
    externalProviderNotice: 'Provider: YouTube / Google LLC (youtube-nocookie.com)',
  },
  de: {
    sectionTitle: 'Bikepark-Video',
    playButton: 'Video abspielen',
    privacyNotice: 'Beim Abspielen wird das Video von YouTube (youtube-nocookie.com) geladen. Dabei werden Google-Server kontaktiert und Daten verarbeitet.',
    audioLanguageLabel: 'Audiosprache',
    subtitlesAvailable: 'Untertitel',
    externalProviderNotice: 'Anbieter: YouTube / Google LLC (youtube-nocookie.com)',
  },
  fr: {
    sectionTitle: 'Vidéo du bikepark',
    playButton: 'Lire la vidéo',
    privacyNotice: 'La lecture charge la vidéo depuis YouTube (youtube-nocookie.com). Les serveurs de Google sont contactés et peuvent traiter des données.',
    audioLanguageLabel: 'Langue audio',
    subtitlesAvailable: 'Sous-titres',
    externalProviderNotice: 'Fournisseur : YouTube / Google LLC (youtube-nocookie.com)',
  },
  es: {
    sectionTitle: 'Vídeo del bikepark',
    playButton: 'Reproducir vídeo',
    privacyNotice: 'Al reproducir se cargará el vídeo de YouTube (youtube-nocookie.com). Se contactará con los servidores de Google y pueden procesarse datos.',
    audioLanguageLabel: 'Idioma del audio',
    subtitlesAvailable: 'Subtítulos',
    externalProviderNotice: 'Proveedor: YouTube / Google LLC (youtube-nocookie.com)',
  },
};

export function getVideoUiLabels(locale: string): VideoUiLabels {
  const norm = normalizeLocale(locale);
  return VIDEO_UI_LABELS[norm] || VIDEO_UI_LABELS.cs;
}

export function getLanguageDisplayName(displayLocale: string, targetLanguageCode: string): string {
  const norm = normalizeLocale(displayLocale);
  const primarySubtag = targetLanguageCode.trim().toLowerCase().split(/[-_]/)[0] || '';

  // Try Intl.DisplayNames if supported
  if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
    try {
      const dn = new Intl.DisplayNames([norm], { type: 'language' });
      const name = dn.of(primarySubtag);
      if (name) return name;
    } catch {
      // Fallback to table
    }
  }

  return LANGUAGE_NAMES[norm]?.[primarySubtag] || primarySubtag.toUpperCase();
}

/**
 * Returns a readable explanation when a fallback video is shown.
 * E.g., viewing German article, but showing English video:
 * "Video auf Englisch"
 */
export function getFallbackBadgeText(displayLocale: string, fallbackLanguageCode: string): string {
  const norm = normalizeLocale(displayLocale);
  const langName = getLanguageDisplayName(norm, fallbackLanguageCode);

  switch (norm) {
    case 'en':
      return `Video in ${langName}`;
    case 'de':
      return `Video auf ${langName}`;
    case 'fr':
      return `Vidéo en ${langName}`;
    case 'es':
      return `Vídeo en ${langName}`;
    case 'cs':
    default:
      return `Video v jazyce: ${langName}`;
  }
}
