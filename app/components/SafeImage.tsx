'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

type SafeImageProps = ImageProps & {
  fallbackClassName?: string;
  fallbackLabel?: string;
};

function shouldUseDirectImage(src: ImageProps['src']): boolean {
  if (typeof src !== 'string') {
    return false;
  }

  try {
    const hostname = new URL(src).hostname;

    return hostname === 'commons.wikimedia.org' || hostname === 'upload.wikimedia.org';
  } catch {
    return false;
  }
}

export default function SafeImage({
  alt,
  fallbackClassName,
  fallbackLabel = 'Euvida',
  onError,
  src,
  unoptimized,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#dbeafe_0%,#e0f2fe_40%,#fef3c7_100%)] px-5 text-center ${fallbackClassName ?? ''}`}
      >
        <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
          <span className="text-xs font-extrabold uppercase tracking-wide text-blue-950">
            {fallbackLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      src={src}
      unoptimized={unoptimized ?? shouldUseDirectImage(src)}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
