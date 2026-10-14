'use client';

import { getDestinationLabel } from '@/lib/destinationLabels';
import { useEffect, useState } from 'react';

type ScrollToTopButtonProps = {
  locale: string;
};

export default function ScrollToTopButton({ locale }: ScrollToTopButtonProps) {
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleScroll() {
      setIsScrolledDown(window.scrollY > 400);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  };

  const label = getDestinationLabel(locale, 'scrollToTop');

  return (
    <button
      type="button"
      onClick={handleScrollToTop}
      tabIndex={isScrolledDown ? 0 : -1}
      aria-hidden={!isScrolledDown}
      className={`group fixed bottom-6 right-6 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-slate-900/90 text-emerald-400 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-emerald-500/60 hover:bg-emerald-500/20 hover:text-white hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer ${
        isScrolledDown
          ? 'opacity-100 translate-y-0 pointer-events-auto visible'
          : 'opacity-0 translate-y-4 pointer-events-none invisible'
      }`}
      aria-label={label}
      title={label}
    >
      <svg
        className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:-translate-y-0.5 motion-reduce:group-hover:transform-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}
