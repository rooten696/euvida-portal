'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type HideOnScrollHeaderProps = {
  children: ReactNode;
  className?: string;
  forceVisible?: boolean;
};

export default function HideOnScrollHeader({
  children,
  className = '',
  forceVisible = false,
}: HideOnScrollHeaderProps) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeader = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY < 80 || delta < -4) {
        setIsHidden(false);
      } else if (delta > 4) {
        setIsHidden(true);
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`${className} transform-gpu transition-transform duration-300 ease-out ${
          isHidden && !forceVisible ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        {children}
      </header>
    </>
  );
}
