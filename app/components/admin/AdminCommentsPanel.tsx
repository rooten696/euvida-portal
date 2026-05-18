'use client';

import { supabase } from '@/lib/supabaseBrowserClient';
import { useCallback, useEffect, useMemo, useState } from 'react';

type CommentStatus = 'pending' | 'approved' | 'rejected';

type AdminComment = {
  id: string;
  article_slug: string;
  user_id: string;
  author_name: string | null;
  user_email: string | null;
  content: string;
  status: CommentStatus;
  created_at: string;
  updated_at?: string | null;
};

const statusLabels: Record<CommentStatus, string> = {
  pending: 'Čeká',
  approved: 'Schváleno',
  rejected: 'Zamítnuto',
};

const statusStyles: Record<CommentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

function isMissingTableError(message: string): boolean {
  return message.includes('article_comments') || message.includes('relation') || message.includes('schema cache');
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminCommentsPanel() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [filter, setFilter] = useState<CommentStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [setupMissing, setSetupMissing] = useState(false);
  const [status, setStatus] = useState('');

  const filteredComments = useMemo(
    () => comments.filter((comment) => (filter === 'all' ? true : comment.status === filter)),
    [comments, filter]
  );

  const loadComments = useCallback(async () => {
    setLoading(true);
    setStatus('');

    const { data, error } = await supabase
      .from('article_comments')
      .select('id, article_slug, user_id, author_name, user_email, content, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingTableError(error.message)) {
        setSetupMissing(true);
        setComments([]);
      } else {
        setStatus(`Chyba načtení komentářů: ${error.message}`);
      }
    } else {
      setSetupMissing(false);
      setComments((data ?? []) as AdminComment[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadComments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadComments]);

  const updateCommentStatus = async (id: string, nextStatus: CommentStatus) => {
    setStatus('Ukládám změnu komentáře...');

    const { error } = await supabase
      .from('article_comments')
      .update({
        status: nextStatus,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      setStatus(`Chyba: ${error.message}`);
      return;
    }

    setComments((current) =>
      current.map((comment) =>
        comment.id === id ? { ...comment, status: nextStatus } : comment
      )
    );
    setStatus('Komentář uložen.');
  };

  const deleteComment = async (id: string) => {
    setStatus('Mažu komentář...');

    const { error } = await supabase
      .from('article_comments')
      .delete()
      .eq('id', id);

    if (error) {
      setStatus(`Chyba: ${error.message}`);
      return;
    }

    setComments((current) => current.filter((comment) => comment.id !== id));
    setStatus('Komentář smazán.');
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Moderace</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Komentáře pod články</h2>
          <p className="mt-1 text-sm text-slate-500">
            Schvaluj, zamítej nebo maž komentáře od registrovaných uživatelů.
          </p>
        </div>
        <button
          type="button"
          onClick={loadComments}
          className="w-fit rounded-xl bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200"
        >
          Obnovit
        </button>
      </div>

      {setupMissing ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-900">
          Tabulka article_comments zatím v Supabase neexistuje. Připravený SQL skript je v repozitáři v souboru supabase/article_comments.sql.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                  filter === value
                    ? 'bg-blue-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {value === 'all' ? 'Vše' : statusLabels[value]}
              </button>
            ))}
          </div>

          {status && (
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              {status}
            </p>
          )}

          {loading ? (
            <div className="mt-4 space-y-3">
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : filteredComments.length > 0 ? (
            <div className="mt-4 space-y-3">
              {filteredComments.map((comment) => (
                <article key={comment.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusStyles[comment.status]}`}>
                          {statusLabels[comment.status]}
                        </span>
                        <p className="break-words text-sm font-extrabold text-slate-950">
                          {comment.author_name || comment.user_email || 'Uživatel'}
                        </p>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        /article/{comment.article_slug} · {formatDate(comment.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateCommentStatus(comment.id, 'approved')}
                        disabled={comment.status === 'approved'}
                        className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-extrabold text-green-800 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Schválit
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCommentStatus(comment.id, 'rejected')}
                        disabled={comment.status === 'rejected'}
                        className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Zamítnout
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteComment(comment.id)}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-extrabold text-red-700 transition hover:bg-red-200"
                      >
                        Smazat
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                    {comment.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              Žádné komentáře pro vybraný filtr.
            </p>
          )}
        </>
      )}
    </section>
  );
}
