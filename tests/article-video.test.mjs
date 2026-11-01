import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);

function load(file, overrides = {}) {
  const filePath = path.resolve(file);
  const fileDir = path.dirname(filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('require', 'exports', 'module', code)(
    (id) => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.startsWith('@/')) {
        const target = path.resolve(id.slice(2));
        try {
          return require(target);
        } catch {
          return load(target.endsWith('.ts') || target.endsWith('.tsx') ? target : `${target}.ts`, overrides);
        }
      }
      if (id.startsWith('./') || id.startsWith('../')) {
        const target = path.resolve(fileDir, id);
        try {
          return require(target);
        } catch {
          const tsTarget = fs.existsSync(`${target}.tsx`)
            ? `${target}.tsx`
            : fs.existsSync(`${target}.ts`)
            ? `${target}.ts`
            : `${target}.tsx`;
          return load(tsTarget, overrides);
        }
      }
      return require(id);
    },
    moduleObj.exports,
    moduleObj
  );
  return moduleObj.exports;
}

const {
  extractValidYouTubeId,
  buildYouTubeEmbedUrl,
  getFallbackLocaleChain,
  resolveArticleVideo,
  getVideoSectionTitle,
  getVideoUiLabels,
  getFallbackBadgeText,
  getLanguageDisplayName,
  articleHasPlayableVideo,
} = load('lib/articleVideo.ts');

/* ============================================================================
   1. Validation: YouTube Video ID & URL parsing
============================================================================ */

test('extractValidYouTubeId accepts valid 11-character video IDs directly', () => {
  assert.equal(extractValidYouTubeId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractValidYouTubeId('a1B2c3D4e5F'), 'a1B2c3D4e5F');
  assert.equal(extractValidYouTubeId('_1aB-cD3eF_'), '_1aB-cD3eF_');
  assert.equal(extractValidYouTubeId('  dQw4w9WgXcQ  '), 'dQw4w9WgXcQ');
});

test('extractValidYouTubeId extracts ID from allowed YouTube URL variants', () => {
  const validUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abcdef1234567890',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'https://youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0',
    'https://www.youtube.com/v/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'HTTP://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ',
  ];

  for (const url of validUrls) {
    assert.equal(
      extractValidYouTubeId(url),
      'dQw4w9WgXcQ',
      `Failed to extract video ID from valid URL: ${url}`
    );
  }
});

test('extractValidYouTubeId strictly rejects invalid or malicious inputs (fails closed)', () => {
  const invalidInputs = [
    null,
    undefined,
    12345,
    {},
    [],
    '',
    '   ',
    'short',
    '10charLong',
    '12charsLong_',
    'tooLongVideoId123456789',
    'dQw4w9Wg<script>',
    'dQw4w9Wg"abc',
    'dQw4w9Wg/abc',
    'dQw4w9Wg;abc',
    // Phishing / spoofed domains
    'https://evil-youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com.attacker.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ',
    'https://notyoutube.com/dQw4w9WgXcQ',
    'https://vimeo.com/123456789',
    'https://dailymotion.com/video/x7tgad0',
    // Injections & dangerous schemes
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox',
    'ftp://www.youtube.com/watch?v=dQw4w9WgXcQ',
  ];

  for (const input of invalidInputs) {
    assert.equal(
      extractValidYouTubeId(input),
      null,
      `Expected input to be rejected: ${input}`
    );
  }
});

test('buildYouTubeEmbedUrl produces strict youtube-nocookie.com URL without autoplay', () => {
  const url = buildYouTubeEmbedUrl('dQw4w9WgXcQ');
  assert.equal(url, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  assert.ok(!url.includes('autoplay'), 'Must NOT contain autoplay');

  assert.throws(() => buildYouTubeEmbedUrl('invalid-id'), /Invalid YouTube video ID/);
  assert.throws(() => buildYouTubeEmbedUrl('https://youtube.com/watch?v=dQw4w9WgXcQ'), /Invalid YouTube video ID/);
});

/* ============================================================================
   2. Deterministic Fallback Chain: L -> en -> cs
============================================================================ */

test('getFallbackLocaleChain follows deterministic order without duplicates', () => {
  assert.deepEqual(getFallbackLocaleChain('cs'), ['cs', 'en']);
  assert.deepEqual(getFallbackLocaleChain('en'), ['en', 'cs']);
  assert.deepEqual(getFallbackLocaleChain('de'), ['de', 'en', 'cs']);
  assert.deepEqual(getFallbackLocaleChain('fr'), ['fr', 'en', 'cs']);
  assert.deepEqual(getFallbackLocaleChain('es'), ['es', 'en', 'cs']);
});

test('resolveArticleVideo selects native locale video when available', () => {
  const article = {
    slug: 'szczyrk-enduro-trails',
    source_info: {
      videos: {
        cs: {
          video_id: 'csVideo1111',
          title: 'Szczyrk česky',
          channel: 'Trail Hunter',
          audio_language: 'cs',
        },
        en: {
          video_id: 'enVideo2222',
          title: 'Szczyrk in English',
          channel: 'Global Mountain Bike Network',
          audio_language: 'en',
        },
        de: {
          video_id: 'deVideo3333',
          title: 'Szczyrk auf Deutsch',
          channel: 'MTB Rider',
          audio_language: 'de',
        },
      },
    },
  };

  const resolvedCs = resolveArticleVideo(article, 'cs');
  assert.ok(resolvedCs);
  assert.equal(resolvedCs.videoId, 'csVideo1111');
  assert.equal(resolvedCs.isFallback, false);
  assert.equal(resolvedCs.resolvedLocale, 'cs');
  assert.equal(resolvedCs.requestedLocale, 'cs');
  assert.equal(resolvedCs.title, 'Szczyrk česky');

  const resolvedDe = resolveArticleVideo(article, 'de');
  assert.ok(resolvedDe);
  assert.equal(resolvedDe.videoId, 'deVideo3333');
  assert.equal(resolvedDe.isFallback, false);
  assert.equal(resolvedDe.resolvedLocale, 'de');
});

test('resolveArticleVideo falls back to en, then cs when requested locale is missing', () => {
  const articleEnCs = {
    slug: 'hahnenklee-bikepark',
    source_info: {
      videos: {
        en: {
          video_id: 'enHahnen111',
          title: 'Hahnenklee English Guide',
          channel: 'Downhill Central',
          audio_language: 'en',
        },
        cs: {
          video_id: 'csHahnen222',
          title: 'Hahnenklee český pohled',
          channel: 'Bike O’Clock',
          audio_language: 'cs',
        },
      },
    },
  };

  // German viewer -> falls back to en
  const resolvedDe = resolveArticleVideo(articleEnCs, 'de');
  assert.ok(resolvedDe);
  assert.equal(resolvedDe.videoId, 'enHahnen111');
  assert.equal(resolvedDe.isFallback, true);
  assert.equal(resolvedDe.resolvedLocale, 'en');
  assert.equal(resolvedDe.requestedLocale, 'de');
  assert.equal(resolvedDe.audioLanguage, 'en');

  // French viewer -> falls back to en
  const resolvedFr = resolveArticleVideo(articleEnCs, 'fr');
  assert.ok(resolvedFr);
  assert.equal(resolvedFr.videoId, 'enHahnen111');
  assert.equal(resolvedFr.isFallback, true);
  assert.equal(resolvedFr.resolvedLocale, 'en');

  // Now an article with ONLY Czech video
  const articleCsOnly = {
    slug: 'albstadt-bikepark',
    source_info: {
      videos: {
        cs: {
          video_id: 'csAlbstadt1',
          title: 'Albstadt tratě',
          channel: 'Trail Hunter',
          audio_language: 'cs',
        },
      },
    },
  };

  // German viewer -> en missing, falls back to cs
  const resolvedDeCsFallback = resolveArticleVideo(articleCsOnly, 'de');
  assert.ok(resolvedDeCsFallback);
  assert.equal(resolvedDeCsFallback.videoId, 'csAlbstadt1');
  assert.equal(resolvedDeCsFallback.isFallback, true);
  assert.equal(resolvedDeCsFallback.resolvedLocale, 'cs');
  assert.equal(resolvedDeCsFallback.requestedLocale, 'de');
  assert.equal(resolvedDeCsFallback.audioLanguage, 'cs');
});

test('resolveArticleVideo resolves foreign quality fallback (e.g. sk, pl, it) when native, en, and cs are missing', () => {
  const articleSkOnly = {
    slug: 'spindleruv-mlyn-ski',
    category: 'ski_area',
    source_info: {
      videos: {
        sk: {
          video_id: 'rRdEHpKADck',
          title: 'Špindlerův Mlýn lyžovačka',
          channel: 'Slovakia Skiers',
          audio_language: 'sk',
          embed_allowed: true,
          quality_note: 'Kvalitní přehled sjezdovek a lanovek',
        },
      },
    },
  };

  // Czech viewer: cs missing, en missing, falls back to sk
  const resolvedCs = resolveArticleVideo(articleSkOnly, 'cs');
  assert.ok(resolvedCs);
  assert.equal(resolvedCs.videoId, 'rRdEHpKADck');
  assert.equal(resolvedCs.resolvedLocale, 'sk');
  assert.equal(resolvedCs.requestedLocale, 'cs');
  assert.equal(resolvedCs.isFallback, true);
  assert.equal(resolvedCs.audioLanguage, 'sk');
  assert.equal(resolvedCs.category, 'ski_area');

  // English viewer: en missing, cs missing, falls back to sk
  const resolvedEn = resolveArticleVideo(articleSkOnly, 'en');
  assert.ok(resolvedEn);
  assert.equal(resolvedEn.videoId, 'rRdEHpKADck');
  assert.equal(resolvedEn.resolvedLocale, 'sk');
  assert.equal(resolvedEn.requestedLocale, 'en');
  assert.equal(resolvedEn.isFallback, true);

  // German viewer: de missing, en missing, cs missing, falls back to sk
  const resolvedDe = resolveArticleVideo(articleSkOnly, 'de');
  assert.ok(resolvedDe);
  assert.equal(resolvedDe.videoId, 'rRdEHpKADck');
  assert.equal(resolvedDe.resolvedLocale, 'sk');

  // French viewer
  const resolvedFr = resolveArticleVideo(articleSkOnly, 'fr');
  assert.ok(resolvedFr);
  assert.equal(resolvedFr.videoId, 'rRdEHpKADck');

  // Spanish viewer
  const resolvedEs = resolveArticleVideo(articleSkOnly, 'es');
  assert.ok(resolvedEs);
  assert.equal(resolvedEs.videoId, 'rRdEHpKADck');
});

test('resolveArticleVideo prioritizes video_fallback_order and respects explicit empty disabling', () => {
  const multiVideoArticle = {
    slug: 'schladming-4-berge-ski',
    category: 'ski_area',
    source_info: {
      videos: {
        pl: {
          video_id: 'plSchlad111',
          title: 'Schladming po polsku',
          channel: 'Polski Narciarz',
          audio_language: 'pl',
          embed_allowed: true,
        },
        sk: {
          video_id: 'skSchlad222',
          title: 'Schladming slovensky',
          channel: 'Tatry Team',
          audio_language: 'sk',
          embed_allowed: true,
        },
      },
      video_fallback_order: ['sk', 'pl'],
    },
  };

  // cs viewer -> chain: cs -> en -> sk -> pl -> selects sk
  const resolvedCs = resolveArticleVideo(multiVideoArticle, 'cs');
  assert.ok(resolvedCs);
  assert.equal(resolvedCs.videoId, 'skSchlad222');
  assert.equal(resolvedCs.resolvedLocale, 'sk');

  // If fallback order is changed to ['pl', 'sk'] -> pl is selected first
  const plFirst = {
    ...multiVideoArticle,
    source_info: {
      ...multiVideoArticle.source_info,
      video_fallback_order: ['pl', 'sk'],
    },
  };
  const resolvedCsPl = resolveArticleVideo(plFirst, 'cs');
  assert.ok(resolvedCsPl);
  assert.equal(resolvedCsPl.videoId, 'plSchlad111');
  assert.equal(resolvedCsPl.resolvedLocale, 'pl');

  // If video_fallback_order is explicitly empty [], foreign fallback is disabled
  const disabledFallback = {
    ...multiVideoArticle,
    source_info: {
      ...multiVideoArticle.source_info,
      video_fallback_order: [],
    },
  };
  assert.equal(resolveArticleVideo(disabledFallback, 'cs'), null);
  assert.equal(resolveArticleVideo(disabledFallback, 'en'), null);
  assert.equal(resolveArticleVideo(disabledFallback, 'de'), null);
});

test('resolveArticleVideo returns to native video when switching back from fallback', () => {
  const article = {
    slug: 'myto-ski-bike',
    source_info: {
      videos: {
        cs: {
          video_id: 'csMyto12345',
          title: 'Mýto český průvodce',
          audio_language: 'cs',
        },
        en: {
          video_id: 'enMyto12345',
          title: 'Myto English overview',
          audio_language: 'en',
        },
      },
    },
  };

  // When visiting in Spanish -> fallback to en
  const esResult = resolveArticleVideo(article, 'es');
  assert.equal(esResult.isFallback, true);
  assert.equal(esResult.resolvedLocale, 'en');
  assert.equal(esResult.videoId, 'enMyto12345');

  // When switching to Czech -> immediately returns native Czech video
  const csResult = resolveArticleVideo(article, 'cs');
  assert.equal(csResult.isFallback, false);
  assert.equal(csResult.resolvedLocale, 'cs');
  assert.equal(csResult.videoId, 'csMyto12345');
});

test('resolveArticleVideo skips embed_allowed=false and invalid IDs in chain', () => {
  const article = {
    slug: 'san-martino-arena',
    source_info: {
      videos: {
        de: {
          video_id: 'deSanMart11',
          embed_allowed: false, // Disallowed embed
        },
        en: {
          video_id: 'invalid-id-short', // Invalid ID
        },
        cs: {
          video_id: 'csSanMart22',
          embed_allowed: true,
          audio_language: 'cs',
        },
      },
    },
  };

  // German request: de is skipped (not allowed), en is skipped (invalid ID), falls back to cs
  const resolved = resolveArticleVideo(article, 'de');
  assert.ok(resolved);
  assert.equal(resolved.videoId, 'csSanMart22');
  assert.equal(resolved.resolvedLocale, 'cs');
  assert.equal(resolved.isFallback, true);
});

test('resolveArticleVideo rejects entries where audio_language disagrees with slot key', () => {
  const mismatchedArticle = {
    slug: 'dishonest-audio-entry',
    source_info: {
      videos: {
        cs: {
          video_id: 'csVideo1111',
          audio_language: 'de', // Disagrees with cs key
          embed_allowed: true,
        },
        sk: {
          video_id: 'skVideo2222',
          audio_language: 'sk', // Legitimate Slovak audio
          embed_allowed: true,
        },
      },
    },
  };

  // cs viewer: cs entry is rejected due to mismatched audio language -> falls back to sk
  const resolved = resolveArticleVideo(mismatchedArticle, 'cs');
  assert.ok(resolved);
  assert.equal(resolved.videoId, 'skVideo2222');
  assert.equal(resolved.resolvedLocale, 'sk');
});

test('resolveArticleVideo defensively ignores prototype keys and normalizes fallback order codes', () => {
  const maliciousArticle = {
    slug: 'prototype-edge-case',
    source_info: {
      videos: {
        constructor: { video_id: 'badBadBad11', embed_allowed: true },
        toString: { video_id: 'badBadBad22', embed_allowed: true },
        sk: {
          video_id: 'validSkVid1',
          audio_language: 'sk-SK',
          embed_allowed: true,
        },
      },
      video_fallback_order: ['__proto__', 'constructor', 'SK', 'invalid-too-long-language-code'],
    },
  };

  const resolved = resolveArticleVideo(maliciousArticle, 'cs');
  assert.ok(resolved);
  assert.equal(resolved.videoId, 'validSkVid1');
  assert.equal(resolved.resolvedLocale, 'sk');
});

test('resolveArticleVideo returns null when no video or only un-embeddable videos exist', () => {
  assert.equal(resolveArticleVideo(null, 'cs'), null);
  assert.equal(resolveArticleVideo({}, 'cs'), null);
  assert.equal(resolveArticleVideo({ source_info: {} }, 'cs'), null);
  assert.equal(resolveArticleVideo({ source_info: { videos: {} } }, 'cs'), null);
  assert.equal(resolveArticleVideo({ source_info: { videos: [] } }, 'cs'), null);
  assert.equal(resolveArticleVideo({ source_info: { videos: 'invalid' } }, 'cs'), null);

  const blockedArticle = {
    source_info: {
      videos: {
        cs: { video_id: 'csBlocked11', embed_allowed: false },
        en: { video_id: 'enBlocked22', embed_allowed: 'false' },
      },
    },
  };
  assert.equal(resolveArticleVideo(blockedArticle, 'cs'), null);
  assert.equal(resolveArticleVideo(blockedArticle, 'de'), null);
});

test('resolveArticleVideo safely handles corrupted non-string JSONB properties (fails closed without throwing)', () => {
  const corruptedArticle = {
    source_info: {
      videos: {
        cs: {
          video_id: 'csCorrupt11',
          title: { bad: 'object' },
          channel: 12345,
          quality_note: [1, 2, 3],
          audio_language: 999,
          embed_allowed: true,
        },
      },
    },
  };

  const resolved = resolveArticleVideo(corruptedArticle, 'cs');
  assert.ok(resolved);
  assert.equal(resolved.videoId, 'csCorrupt11');
  assert.equal(resolved.title, null);
  assert.equal(resolved.channel, null);
  assert.equal(resolved.qualityNote, null);
  assert.equal(resolved.audioLanguage, null, 'Non-string audio language must not be used');
});

test('resolveArticleVideo preserves explicit audio_language without inventing one from the slot', () => {
  const articleWithAudio = {
    source_info: {
      videos: {
        en: {
          video_id: 'enAudioVid1',
          audio_language: 'en',
          has_subtitles: true,
          quality_note: 'Official resort overview',
        },
      },
    },
  };

  const resolved = resolveArticleVideo(articleWithAudio, 'de');
  assert.ok(resolved);
  assert.equal(resolved.audioLanguage, 'en');
  assert.equal(resolved.hasSubtitles, true);
  assert.equal(resolved.qualityNote, 'Official resort overview');

  const articleWithoutAudio = {
    source_info: {
      videos: {
        en: {
          video_id: 'enAudioVid1',
        },
      },
    },
  };
  const resolvedNoAudio = resolveArticleVideo(articleWithoutAudio, 'de');
  assert.ok(resolvedNoAudio);
  assert.equal(resolvedNoAudio.audioLanguage, null, 'Must NOT invent an audio language if missing');
});

/* ============================================================================
   3. UI Labels & Fallback notices in all 5 languages
============================================================================ */

test('getVideoUiLabels returns complete localized labels for all supported languages', () => {
  for (const loc of ['cs', 'en', 'de', 'fr', 'es']) {
    const labels = getVideoUiLabels(loc);
    assert.ok(labels.sectionTitle, `Missing sectionTitle for ${loc}`);
    assert.ok(labels.playButton, `Missing playButton for ${loc}`);
    assert.ok(labels.privacyNotice, `Missing privacyNotice for ${loc}`);
    assert.ok(labels.audioLanguageLabel, `Missing audioLanguageLabel for ${loc}`);
  }
});

test('getFallbackBadgeText and language display names localize accurately', () => {
  assert.equal(getLanguageDisplayName('cs', 'en'), 'angličtina');
  assert.equal(getLanguageDisplayName('de', 'en'), 'Englisch');
  assert.equal(getLanguageDisplayName('fr', 'cs'), 'tchèque');
  assert.equal(getLanguageDisplayName('es', 'cs'), 'checo');

  assert.equal(getFallbackBadgeText('cs', 'en'), 'Video v jazyce: angličtina');
  assert.equal(getFallbackBadgeText('de', 'en'), 'Video auf Englisch');
  assert.equal(getFallbackBadgeText('fr', 'en'), 'Vidéo en anglais');
  assert.equal(getFallbackBadgeText('es', 'en'), 'Vídeo en inglés');
  assert.equal(getFallbackBadgeText('en', 'cs'), 'Video in Czech');
});

test('getVideoSectionTitle and getVideoUiLabels localize correctly for ski, bikepark, and other categories', () => {
  // 1. Ski area category (ski_area or ski)
  const skiCategories = ['ski_area', 'ski', ' ski_area '];
  for (const cat of skiCategories) {
    assert.equal(getVideoSectionTitle('cs', cat), 'Video ze ski areálu');
    assert.equal(getVideoSectionTitle('en', cat), 'Ski area video');
    assert.equal(getVideoSectionTitle('de', cat), 'Skigebiet-Video');
    assert.equal(getVideoSectionTitle('fr', cat), 'Vidéo du domaine skiable');
    assert.equal(getVideoSectionTitle('es', cat), 'Vídeo de la estación de esquí');

    assert.equal(getVideoUiLabels('cs', cat).sectionTitle, 'Video ze ski areálu');
    assert.equal(getVideoUiLabels('en', cat).sectionTitle, 'Ski area video');
    assert.equal(getVideoUiLabels('de', cat).sectionTitle, 'Skigebiet-Video');
    assert.equal(getVideoUiLabels('fr', cat).sectionTitle, 'Vidéo du domaine skiable');
    assert.equal(getVideoUiLabels('es', cat).sectionTitle, 'Vídeo de la estación de esquí');
  }

  // 2. Bikepark category (bike_trail, bikepark, or omitted/null for backwards compatibility)
  const bikeCategories = ['bike_trail', 'bikepark', null, undefined, ''];
  for (const cat of bikeCategories) {
    assert.equal(getVideoSectionTitle('cs', cat), 'Video z bikeparku');
    assert.equal(getVideoSectionTitle('en', cat), 'Bikepark video');
    assert.equal(getVideoSectionTitle('de', cat), 'Bikepark-Video');
    assert.equal(getVideoSectionTitle('fr', cat), 'Vidéo du bikepark');
    assert.equal(getVideoSectionTitle('es', cat), 'Vídeo del bikepark');

    assert.equal(getVideoUiLabels('cs', cat).sectionTitle, 'Video z bikeparku');
    assert.equal(getVideoUiLabels('en', cat).sectionTitle, 'Bikepark video');
    assert.equal(getVideoUiLabels('de', cat).sectionTitle, 'Bikepark-Video');
    assert.equal(getVideoUiLabels('fr', cat).sectionTitle, 'Vidéo du bikepark');
    assert.equal(getVideoUiLabels('es', cat).sectionTitle, 'Vídeo del bikepark');
  }

  // 3. Generic other category (places, landmark, nature, natural_swimming, trip)
  const genericCategories = ['places', 'landmark', 'nature', 'natural_swimming', 'trip'];
  for (const cat of genericCategories) {
    assert.equal(getVideoSectionTitle('cs', cat), 'Video z místa');
    assert.equal(getVideoSectionTitle('en', cat), 'Destination video');
    assert.equal(getVideoSectionTitle('de', cat), 'Video vom Reiseziel');
    assert.equal(getVideoSectionTitle('fr', cat), 'Vidéo de la destination');
    assert.equal(getVideoSectionTitle('es', cat), 'Vídeo del destino');

    assert.equal(getVideoUiLabels('cs', cat).sectionTitle, 'Video z místa');
  }
});

test('getFallbackBadgeText and language display names localize foreign quality fallback languages (sk, pl, it)', () => {
  // Slovak
  assert.equal(getLanguageDisplayName('cs', 'sk'), 'slovenština');
  assert.equal(getLanguageDisplayName('en', 'sk'), 'Slovak');
  assert.equal(getLanguageDisplayName('de', 'sk'), 'Slowakisch');
  assert.equal(getLanguageDisplayName('fr', 'sk'), 'slovaque');
  assert.equal(getLanguageDisplayName('es', 'sk'), 'eslovaco');

  assert.equal(getFallbackBadgeText('cs', 'sk'), 'Video v jazyce: slovenština');
  assert.equal(getFallbackBadgeText('en', 'sk'), 'Video in Slovak');
  assert.equal(getFallbackBadgeText('de', 'sk'), 'Video auf Slowakisch');
  assert.equal(getFallbackBadgeText('fr', 'sk'), 'Vidéo en slovaque');
  assert.equal(getFallbackBadgeText('es', 'sk'), 'Vídeo en eslovaco');

  // Polish
  assert.equal(getLanguageDisplayName('cs', 'pl'), 'polština');
  assert.equal(getLanguageDisplayName('en', 'pl'), 'Polish');
  assert.equal(getFallbackBadgeText('cs', 'pl'), 'Video v jazyce: polština');

  // Italian
  assert.equal(getLanguageDisplayName('cs', 'it'), 'italština');
  assert.equal(getLanguageDisplayName('en', 'it'), 'Italian');
  assert.equal(getFallbackBadgeText('cs', 'it'), 'Video v jazyce: italština');
});

test('articleHasPlayableVideo accurately evaluates video availability without consent dependency', () => {
  const articleWithVideo = {
    slug: 'spindl',
    source_info: {
      videos: {
        cs: { video_id: 'rRdEHpKADck', embed_allowed: true },
      },
    },
  };
  assert.equal(articleHasPlayableVideo(articleWithVideo, 'cs'), true);
  assert.equal(articleHasPlayableVideo(articleWithVideo, 'en'), true); // falls back to cs
  assert.equal(articleHasPlayableVideo(articleWithVideo, 'de'), true); // falls back to cs

  const articleWithoutVideo = { slug: 'empty', source_info: { videos: {} } };
  assert.equal(articleHasPlayableVideo(articleWithoutVideo, 'cs'), false);

  const articleBlocked = {
    slug: 'blocked',
    source_info: {
      videos: { cs: { video_id: 'rRdEHpKADck', embed_allowed: false } },
    },
  };
  assert.equal(articleHasPlayableVideo(articleBlocked, 'cs'), false);

  assert.equal(articleHasPlayableVideo(null, 'cs'), false);
  assert.equal(articleHasPlayableVideo(undefined, 'cs'), false);
});

/* ============================================================================
   4. Component SSR Rendering: Safe Consent & Click-To-Load
============================================================================ */

test('ArticleVideoPlayer SSR renders click-to-load surface with ZERO third-party requests and NO iframe', () => {
  const ArticleVideoPlayerModule = load('app/components/article/ArticleVideoPlayer.tsx');
  const ArticleVideoPlayer = ArticleVideoPlayerModule.default || ArticleVideoPlayerModule;

  const video = {
    videoId: 'dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    title: 'Szczyrk Enduro Trails - Průvodce',
    channel: 'Trail Hunter',
    requestedLocale: 'cs',
    resolvedLocale: 'cs',
    isFallback: false,
    audioLanguage: 'cs',
    hasSubtitles: true,
    qualityNote: 'Kompletní průjezd hlavních tratí',
  };

  const html = renderToStaticMarkup(
    React.createElement(ArticleVideoPlayer, { video, locale: 'cs' })
  );

  // 1. Must contain the block and heading
  assert.ok(html.includes('article-video-block'), 'Must have article-video-block class');
  assert.ok(html.includes('Video z bikeparku'), 'Must have localized section title');
  assert.ok(html.includes('Szczyrk Enduro Trails - Průvodce'), 'Must render video title');
  assert.ok(html.includes('Trail Hunter'), 'Must render channel name');

  // 2. Click-to-load play button and privacy notice must be present
  assert.ok(html.includes('Povolit video v nastavení cookies'), 'Must render consent settings button');
  assert.ok(html.includes('youtube-nocookie.com'), 'Must reference enhanced privacy domain');

  // 3. ZERO third-party requests: NO iframe and NO external img in initial SSR
  assert.ok(!html.includes('<iframe'), 'Must NOT render any <iframe> before user click');
  assert.ok(!html.includes('img.youtube.com'), 'Must NOT request YouTube thumbnails');
  assert.ok(!html.includes('ytimg.com'), 'Must NOT request ytimg');
});

test('ArticleVideo (Server Component) renders player when video exists, returns null when missing', () => {
  const ArticleVideoModule = load('app/components/article/ArticleVideo.tsx');
  const ArticleVideo = ArticleVideoModule.default || ArticleVideoModule;

  const articleWithVideo = {
    slug: 'szczyrk-enduro-trails',
    source_info: {
      videos: {
        cs: {
          video_id: 'dQw4w9WgXcQ',
          title: 'Szczyrk trails',
          embed_allowed: true,
        },
      },
    },
  };

  const htmlWithVideo = renderToStaticMarkup(
    React.createElement(ArticleVideo, { article: articleWithVideo, locale: 'cs' })
  );
  assert.ok(htmlWithVideo.includes('article-video-block'));

  const htmlNoVideo = renderToStaticMarkup(
    React.createElement(ArticleVideo, { article: { slug: 'no-video' }, locale: 'cs' })
  );
  assert.equal(htmlNoVideo, '', 'Server component must return null when no video exists');
});

test('ArticleVideoPlayer SSR renders ski category section title and foreign fallback badge', () => {
  const ArticleVideoPlayerModule = load('app/components/article/ArticleVideoPlayer.tsx');
  const ArticleVideoPlayer = ArticleVideoPlayerModule.default || ArticleVideoPlayerModule;

  const video = {
    videoId: 'rRdEHpKADck',
    embedUrl: 'https://www.youtube-nocookie.com/embed/rRdEHpKADck?rel=0',
    title: 'Špindlerův Mlýn lyžování',
    channel: 'Ski Channel',
    requestedLocale: 'cs',
    resolvedLocale: 'sk',
    isFallback: true,
    audioLanguage: 'sk',
    hasSubtitles: false,
    qualityNote: 'Zimní průvodce Špindlu',
    category: 'ski_area',
  };

  const htmlCs = renderToStaticMarkup(
    React.createElement(ArticleVideoPlayer, { video, locale: 'cs', category: 'ski_area' })
  );
  assert.ok(htmlCs.includes('Video ze ski areálu'), 'Must render localized ski title in cs');
  assert.ok(htmlCs.includes('Video v jazyce: slovenština'), 'Must render Slovak fallback badge');

  const htmlEn = renderToStaticMarkup(
    React.createElement(ArticleVideoPlayer, { video, locale: 'en', category: 'ski_area' })
  );
  assert.ok(htmlEn.includes('Ski area video'), 'Must render localized ski title in en');
  assert.ok(htmlEn.includes('Video in Slovak'), 'Must render Slovak fallback badge in en');

  const htmlDe = renderToStaticMarkup(
    React.createElement(ArticleVideoPlayer, { video, locale: 'de', category: 'ski_area' })
  );
  assert.ok(htmlDe.includes('Skigebiet-Video'), 'Must render localized ski title in de');
});

test('ArticleVideo passes category to ArticleVideoPlayer for ski and bikepark articles', () => {
  const ArticleVideoModule = load('app/components/article/ArticleVideo.tsx');
  const ArticleVideo = ArticleVideoModule.default || ArticleVideoModule;

  const skiArticle = {
    slug: 'schladming-4-berge-ski',
    category: 'ski_area',
    source_info: {
      videos: {
        cs: {
          video_id: 'Ej0IF72Z7D4',
          title: 'Schladming 4-Berge',
          embed_allowed: true,
        },
      },
    },
  };

  const htmlSki = renderToStaticMarkup(
    React.createElement(ArticleVideo, { article: skiArticle, locale: 'cs' })
  );
  assert.ok(htmlSki.includes('Video ze ski areálu'), 'ArticleVideo must pass category to render ski heading');
  assert.ok(!htmlSki.includes('Video z bikeparku'), 'Ski article must NOT render bikepark heading');

  const bikeArticle = {
    slug: 'bikepark-spicak',
    category: 'bike_trail',
    source_info: {
      videos: {
        cs: {
          video_id: 'Ej0IF72Z7D4',
          title: 'Špičák trails',
          embed_allowed: true,
        },
      },
    },
  };

  const htmlBike = renderToStaticMarkup(
    React.createElement(ArticleVideo, { article: bikeArticle, locale: 'cs' })
  );
  assert.ok(htmlBike.includes('Video z bikeparku'), 'Bikepark article must render bikepark heading');
});

/* ============================================================================
   5. Interactive Lifecycle: Play button, focus & Clean Reset on Locale Switch
============================================================================ */

function findInTree(tree, predicate) {
  if (!tree) return null;
  if (predicate(tree)) return tree;
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const match = findInTree(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (tree.props && tree.props.children) {
    return findInTree(tree.props.children, predicate);
  }
  return null;
}

test('ArticleVideoPlayer consent lifecycle: settings, automatic load, locale replacement and withdrawal', () => {
  let allowed = false;
  let settingsRequests = 0;

  const mockedReact = {
    ...React,
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  };

  const ArticleVideoPlayerModule = load('app/components/article/ArticleVideoPlayer.tsx', {
    react: mockedReact,
    '@/lib/cookie-consent': {
      hasVideoConsent: () => allowed,
      subscribeCookiePreferences: () => () => {},
      openCookieSettings: () => { settingsRequests++; },
    },
  });
  const ArticleVideoPlayer = ArticleVideoPlayerModule.default || ArticleVideoPlayerModule;

  const article = {
    slug: 'szczyrk-enduro-trails',
    source_info: {
      videos: {
        cs: {
          video_id: 'csVideo1111',
          title: 'Szczyrk česky',
          channel: 'Trail Hunter',
          audio_language: 'cs',
        },
        en: {
          video_id: 'enVideo2222',
          title: 'Szczyrk in English',
          channel: 'Global Mountain Bike Network',
          audio_language: 'en',
        },
      },
    },
  };

  function render(locale) {
    const resolvedVideo = resolveArticleVideo(article, locale);
    assert.ok(resolvedVideo);
    return ArticleVideoPlayer({ video: resolvedVideo, locale });
  }

  // --- Step 1: Initial render in Czech ---
  let tree = render('cs');
  assert.ok(tree, 'Component must render in cs');

  // Verify click-to-load exists, no iframe
  const clickToLoad = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-click-to-load');
  assert.ok(clickToLoad, 'Must render click-to-load container initially');
  const iframeBefore = findInTree(tree, (n) => n?.type === 'iframe');
  assert.equal(iframeBefore, null, 'Must NOT render iframe before explicit user click');

  // Verify no fallback badge on native cs
  const fallbackBadgeCs = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-fallback-badge');
  assert.equal(fallbackBadgeCs, null, 'Native cs video must not have fallback badge');

  // --- Step 2: User clicks Play button ---
  const playBtn = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-play-button');
  assert.ok(playBtn, 'Must find play button');
  playBtn.props.onClick();
  assert.equal(settingsRequests, 1, 'Placeholder opens shared consent settings');
  assert.equal(findInTree(render('cs'), n => n?.type === 'iframe'), null, 'Clicking settings alone is not consent');
  allowed = true;

  // Re-render after state change
  tree = render('cs');
  const clickToLoadAfterPlay = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-click-to-load');
  assert.equal(clickToLoadAfterPlay, null, 'Click-to-load surface must be replaced once playing');

  const iframeAfterPlay = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-iframe');
  assert.ok(iframeAfterPlay, 'Must mount iframe after user clicks play');
  assert.equal(iframeAfterPlay.props.src, 'https://www.youtube-nocookie.com/embed/csVideo1111?rel=0');
  assert.ok(!iframeAfterPlay.props.allow.includes('autoplay'), 'Autoplay must NOT be allowed');
  assert.ok(iframeAfterPlay.props.sandbox, 'Sandbox must be present');
  assert.equal(iframeAfterPlay.props.referrerPolicy, 'strict-origin-when-cross-origin');

  // --- Step 3: Visitor switches language to German (de) ---
  // Must reset isPlaying to false, unmount cs iframe, and resolve en fallback!
  tree = render('de');

  const iframeAfterLocaleSwitch = findInTree(tree, (n) => n?.type === 'iframe');
  assert.ok(iframeAfterLocaleSwitch, 'Existing video consent applies to the new locale without another prompt');
  assert.equal(iframeAfterLocaleSwitch.props.src, 'https://www.youtube-nocookie.com/embed/enVideo2222?rel=0');
  assert.notEqual(iframeAfterLocaleSwitch.key, iframeAfterPlay.key, 'React replaces the old provider frame');

  const clickToLoadDe = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-click-to-load');
  assert.equal(clickToLoadDe, null, 'No second consent surface after an initial video grant');

  const fallbackBadgeDe = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-fallback-badge');
  assert.ok(fallbackBadgeDe, 'German viewer with English video must see fallback badge');

  // --- Step 4: Play English fallback video in German view ---
  tree = render('de');

  const iframeDe = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-iframe');
  assert.ok(iframeDe, 'Must mount iframe for English video in German view');
  assert.equal(iframeDe.props.src, 'https://www.youtube-nocookie.com/embed/enVideo2222?rel=0');

  // --- Step 5: Switch back to Czech ---
  // Must reset isPlaying again and switch video back to native Czech
  tree = render('cs');
  const iframeReturnedToCs = findInTree(tree, (n) => n?.type === 'iframe');
  assert.equal(iframeReturnedToCs.props.src, 'https://www.youtube-nocookie.com/embed/csVideo1111?rel=0');
  allowed = false;
  assert.equal(findInTree(render('cs'), n => n?.type === 'iframe'), null, 'Withdrawal removes the active iframe');
});

test('ArticleVideoPlayer interactive lifecycle: article change, foreign language fallback, and clearing after player starts', () => {
  let allowed = true; // Started with active video consent

  const mockedReact = {
    ...React,
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  };

  const ArticleVideoPlayerModule = load('app/components/article/ArticleVideoPlayer.tsx', {
    react: mockedReact,
    '@/lib/cookie-consent': {
      hasVideoConsent: () => allowed,
      subscribeCookiePreferences: () => () => {},
      openCookieSettings: () => {},
    },
  });
  const ArticleVideoPlayer = ArticleVideoPlayerModule.default || ArticleVideoPlayerModule;

  const ArticleVideoModule = load('app/components/article/ArticleVideo.tsx', {
    react: mockedReact,
    './ArticleVideoPlayer': { default: ArticleVideoPlayer },
    '@/lib/cookie-consent': {
      hasVideoConsent: () => allowed,
      subscribeCookiePreferences: () => () => {},
      openCookieSettings: () => {},
    },
  });
  const ArticleVideo = ArticleVideoModule.default || ArticleVideoModule;

  const skiArticleSpindl = {
    slug: 'spindleruv-mlyn-ski',
    category: 'ski_area',
    source_info: {
      videos: {
        sk: {
          video_id: 'rRdEHpKADck',
          title: 'Špindlerův Mlýn lyžovačka',
          channel: 'Slovakia Skiers',
          audio_language: 'sk',
          embed_allowed: true,
        },
      },
    },
  };

  const skiArticleSchladming = {
    slug: 'schladming-4-berge-ski',
    category: 'ski_area',
    source_info: {
      videos: {
        en: {
          video_id: 'JmMRO-IU4cQ',
          title: 'Schladming English Guide',
          channel: 'Snowii',
          audio_language: 'en',
          embed_allowed: true,
        },
      },
    },
  };

  const articleWithoutVideo = {
    slug: 'no-video-destination',
    category: 'places',
    source_info: {
      videos: {},
    },
  };

  function render(art, loc) {
    const el = ArticleVideo({ article: art, locale: loc });
    if (!el) return null;
    return ArticleVideoPlayer(el.props);
  }

  // 1. Render Spindl in German: foreign fallback Slovak is resolved
  let tree = render(skiArticleSpindl, 'de');
  let iframe = findInTree(tree, (n) => n?.type === 'iframe');
  assert.ok(iframe, 'Must mount iframe when consent is active');
  assert.equal(iframe.props.src, 'https://www.youtube-nocookie.com/embed/rRdEHpKADck?rel=0');
  let fallbackBadge = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-fallback-badge');
  assert.equal(fallbackBadge?.props?.children, 'Video auf Slowakisch');
  let heading = findInTree(tree, (n) => n?.props?.id === 'article-video-title');
  assert.equal(heading?.props?.children, 'Skigebiet-Video');

  // 2. Switch locale to French on same article
  tree = render(skiArticleSpindl, 'fr');
  iframe = findInTree(tree, (n) => n?.type === 'iframe');
  assert.equal(iframe.props.src, 'https://www.youtube-nocookie.com/embed/rRdEHpKADck?rel=0');
  fallbackBadge = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-fallback-badge');
  assert.equal(fallbackBadge?.props?.children, 'Vidéo en slovaque');
  heading = findInTree(tree, (n) => n?.props?.id === 'article-video-title');
  assert.equal(heading?.props?.children, 'Vidéo du domaine skiable');

  // 3. Switch locale to Czech on same article
  tree = render(skiArticleSpindl, 'cs');
  iframe = findInTree(tree, (n) => n?.type === 'iframe');
  assert.equal(iframe.props.src, 'https://www.youtube-nocookie.com/embed/rRdEHpKADck?rel=0');
  fallbackBadge = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-fallback-badge');
  assert.equal(fallbackBadge?.props?.children, 'Video v jazyce: slovenština');
  heading = findInTree(tree, (n) => n?.props?.id === 'article-video-title');
  assert.equal(heading?.props?.children, 'Video ze ski areálu');

  // 4. Switch article to Schladming while player is running
  tree = render(skiArticleSchladming, 'cs');
  iframe = findInTree(tree, (n) => n?.type === 'iframe');
  assert.equal(iframe.props.src, 'https://www.youtube-nocookie.com/embed/JmMRO-IU4cQ?rel=0');
  fallbackBadge = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-fallback-badge');
  assert.equal(fallbackBadge?.props?.children, 'Video v jazyce: angličtina');
  heading = findInTree(tree, (n) => n?.props?.id === 'article-video-title');
  assert.equal(heading?.props?.children, 'Video ze ski areálu');

  // 5. Switch to article with no video -> unmounts cleanly (returns null)
  const noVideoTree = render(articleWithoutVideo, 'cs');
  assert.equal(noVideoTree, null, 'Switching to article without video must unmount player');

  // 6. Clearing / withdrawal: consent revoked
  allowed = false;
  tree = render(skiArticleSchladming, 'cs');
  iframe = findInTree(tree, (n) => n?.type === 'iframe');
  assert.equal(iframe, null, 'Consent withdrawal unmounts iframe back to click-to-load surface');
  const clickToLoad = findInTree(tree, (n) => n?.props?.['data-testid'] === 'video-click-to-load');
  assert.ok(clickToLoad, 'Must show click-to-load placeholder after withdrawal');
});

test('Article detail page mounts ArticleVideo between content and partner offers', () => {
  const pageSource = fs.readFileSync('app/[locale]/article/[slug]/page.tsx', 'utf8');

  assert.ok(
    pageSource.includes("import ArticleVideo from '@/app/components/article/ArticleVideo';"),
    'Page must import ArticleVideo'
  );

  const videoIndex = pageSource.indexOf('<ArticleVideo article={article} locale={locale} />');
  assert.ok(videoIndex > 0, 'Page must mount ArticleVideo');

  const contentIndex = pageSource.indexOf('markdownContent');
  assert.ok(contentIndex > 0, 'Page must render markdownContent');

  const partnerOffersIndex = pageSource.indexOf('<ArticlePartnerOffers');
  assert.ok(partnerOffersIndex > 0, 'Page must render ArticlePartnerOffers');

  assert.ok(
    contentIndex < videoIndex && videoIndex < partnerOffersIndex,
    'ArticleVideo must be mounted directly below the article content and before partner offers'
  );
});
