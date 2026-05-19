'use client'; // Tohle říká Next.js, že tahle část běží u uživatele v prohlížeči

import { useRouter } from 'next/navigation';

export default function BackButton({ label }: { label: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-full text-blue-900 font-bold hover:bg-white shadow-md hover:shadow-lg transition-all"
    >
      &larr; {label}
    </button>
  );
}