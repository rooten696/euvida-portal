'use client';

import { supabase } from '@/lib/supabaseBrowserClient';
import type { Session, User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type CommentStatus = 'pending' | 'approved' | 'rejected';

type ArticleComment = {
  id: string;
  article_slug: string;
  user_id: string;
  author_name: string | null;
  content: string;
  status: CommentStatus;
  created_at: string;
  updated_at?: string | null;
};

type ArticleCommentsProps = {
  articleSlug: string;
  locale: string;
};

type CommentLabels = {
  title: string;
  intro: string;
  empty: string;
  loginPrompt: string;
  loginLink: string;
  formLabel: string;
  submit: string;
  submitting: string;
  pendingNotice: string;
  pendingBadge: string;
  rejectedBadge: string;
  error: string;
  setupMissing: string;
};

const labelsByLocale: Record<string, CommentLabels> = {
  cs: {
    title: 'Komentáře',
    intro: 'Sdílejte vlastní zkušenost nebo praktický tip k místu.',
    empty: 'Zatím tu nejsou žádné komentáře.',
    loginPrompt: 'Komentovat mohou jen přihlášení uživatelé.',
    loginLink: 'Přihlásit se',
    formLabel: 'Tvůj komentář',
    submit: 'Přidat komentář',
    submitting: 'Odesílám...',
    pendingNotice: 'Komentář jsme přijali a čeká na schválení.',
    pendingBadge: 'Čeká na schválení',
    rejectedBadge: 'Zamítnuto',
    error: 'Komentář se nepodařilo uložit. Zkuste to prosím znovu.',
    setupMissing: 'Komentáře jsou připravené ve frontendu. V Supabase je ještě potřeba založit tabulku article_comments.',
  },
  en: {
    title: 'Comments',
    intro: 'Share your own experience or a practical tip for this place.',
    empty: 'No comments yet.',
    loginPrompt: 'Only signed-in users can comment.',
    loginLink: 'Sign in',
    formLabel: 'Your comment',
    submit: 'Add comment',
    submitting: 'Sending...',
    pendingNotice: 'We received your comment and it is waiting for approval.',
    pendingBadge: 'Waiting for approval',
    rejectedBadge: 'Rejected',
    error: 'Could not save the comment. Please try again.',
    setupMissing: 'Comments are ready in the frontend. The article_comments table still needs to be created in Supabase.',
  },
  de: {
    title: 'Kommentare',
    intro: 'Teile deine Erfahrung oder einen praktischen Tipp zu diesem Ort.',
    empty: 'Noch keine Kommentare.',
    loginPrompt: 'Nur angemeldete Nutzer können kommentieren.',
    loginLink: 'Anmelden',
    formLabel: 'Dein Kommentar',
    submit: 'Kommentar hinzufügen',
    submitting: 'Senden...',
    pendingNotice: 'Dein Kommentar wurde gespeichert und wartet auf Freigabe.',
    pendingBadge: 'Wartet auf Freigabe',
    rejectedBadge: 'Abgelehnt',
    error: 'Der Kommentar konnte nicht gespeichert werden. Bitte versuche es erneut.',
    setupMissing: 'Kommentare sind im Frontend vorbereitet. In Supabase muss noch die Tabelle article_comments angelegt werden.',
  },
  fr: {
    title: 'Commentaires',
    intro: 'Partage ton expérience ou une astuce pratique sur ce lieu.',
    empty: 'Aucun commentaire pour le moment.',
    loginPrompt: 'Seuls les utilisateurs connectés peuvent commenter.',
    loginLink: 'Se connecter',
    formLabel: 'Ton commentaire',
    submit: 'Ajouter un commentaire',
    submitting: 'Envoi...',
    pendingNotice: 'Ton commentaire a été reçu et attend validation.',
    pendingBadge: 'En attente',
    rejectedBadge: 'Refusé',
    error: 'Impossible d’enregistrer le commentaire. Réessaie plus tard.',
    setupMissing: 'Les commentaires sont prêts côté interface. La table article_comments doit encore être créée dans Supabase.',
  },
  es: {
    title: 'Comentarios',
    intro: 'Comparte tu experiencia o un consejo práctico sobre este lugar.',
    empty: 'Todavía no hay comentarios.',
    loginPrompt: 'Solo los usuarios conectados pueden comentar.',
    loginLink: 'Iniciar sesión',
    formLabel: 'Tu comentario',
    submit: 'Añadir comentario',
    submitting: 'Enviando...',
    pendingNotice: 'Recibimos tu comentario y está pendiente de aprobación.',
    pendingBadge: 'Pendiente',
    rejectedBadge: 'Rechazado',
    error: 'No se pudo guardar el comentario. Inténtalo de nuevo.',
    setupMissing: 'Los comentarios están listos en el frontend. Aún falta crear la tabla article_comments en Supabase.',
  },
};

function getLabels(locale: string): CommentLabels {
  return labelsByLocale[locale] ?? labelsByLocale.cs;
}

function getDisplayName(user: User): string {
  const metadata = user.user_metadata;
  const name =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : typeof metadata.user_name === 'string'
          ? metadata.user_name
          : null;

  return name?.trim() || user.email?.split('@')[0] || 'Euvida user';
}

function isMissingTableError(message: string): boolean {
  return message.includes('article_comments') || message.includes('relation') || message.includes('schema cache');
}

function formatCommentDate(value: string, locale: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function ArticleComments({ articleSlug, locale }: ArticleCommentsProps) {
  const labels = useMemo(() => getLabels(locale), [locale]);
  const [session, setSession] = useState<Session | null>(null);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [setupMissing, setSetupMissing] = useState(false);

  const fetchComments = useCallback(async (currentSession: Session | null) => {
    setLoading(true);
    setError('');

    let query = supabase
      .from('article_comments')
      .select('id, article_slug, user_id, author_name, content, status, created_at, updated_at')
      .eq('article_slug', articleSlug)
      .order('created_at', { ascending: false });

    if (currentSession?.user.id) {
      query = query.or(`status.eq.approved,user_id.eq.${currentSession.user.id}`);
    } else {
      query = query.eq('status', 'approved');
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      if (isMissingTableError(fetchError.message)) {
        setSetupMissing(true);
      } else {
        setError(fetchError.message);
      }
      setComments([]);
    } else {
      setSetupMissing(false);
      setComments((data ?? []) as ArticleComment[]);
    }

    setLoading(false);
  }, [articleSlug]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      setSession(data.session);
      fetchComments(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      fetchComments(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchComments]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session?.user) {
      return;
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length < 3) {
      setError(labels.error);
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');

    const { data, error: insertError } = await supabase
      .from('article_comments')
      .insert({
        article_slug: articleSlug,
        user_id: session.user.id,
        author_name: getDisplayName(session.user),
        content: trimmedContent,
      })
      .select('id, article_slug, user_id, author_name, content, status, created_at, updated_at')
      .single();

    if (insertError) {
      if (isMissingTableError(insertError.message)) {
        setSetupMissing(true);
      } else {
        setError(labels.error);
      }
    } else if (data) {
      setContent('');
      setNotice(labels.pendingNotice);
      setComments((current) => [data as ArticleComment, ...current]);
    }

    setSubmitting(false);
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-slate-950">{labels.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{labels.intro}</p>
      </div>

      {setupMissing && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-relaxed text-amber-900">
          {labels.setupMissing}
        </p>
      )}

      {session?.user ? (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <label htmlFor="article-comment" className="text-sm font-extrabold text-blue-950">
            {labels.formLabel}
          </label>
          <textarea
            id="article-comment"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            maxLength={2000}
            className="mt-2 w-full resize-y rounded-xl border border-blue-100 bg-white p-3 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-blue-800">
              {content.trim().length}/2000
            </p>
            <button
              type="submit"
              disabled={submitting || content.trim().length < 3}
              className="inline-flex justify-center rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? labels.submitting : labels.submit}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-relaxed text-blue-950">
          <span className="font-semibold">{labels.loginPrompt}</span>{' '}
          <Link href={`/${locale}/login`} className="font-extrabold underline underline-offset-2">
            {labels.loginLink}
          </Link>
        </div>
      )}

      {notice && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
          {notice}
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : comments.length > 0 ? (
        <ol className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-extrabold text-slate-950">
                    {comment.author_name || 'Euvida user'}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {formatCommentDate(comment.created_at, locale)}
                  </p>
                </div>
                {comment.status !== 'approved' && comment.user_id === session?.user.id && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                    comment.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {comment.status === 'pending' ? labels.pendingBadge : labels.rejectedBadge}
                  </span>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                {comment.content}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500">
          {labels.empty}
        </p>
      )}
    </section>
  );
}
