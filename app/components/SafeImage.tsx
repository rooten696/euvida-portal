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
    const { protocol } = new URL(src);

    return protocol === 'http:' || protocol === 'https:';
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
  const imageSrc = src && typeof src === 'string' && src.trim().length > 0 ? src : '/placeholder.png';

  if (failed) {
    return (
      <Image
        {...props}
        alt={alt}
        src="/placeholder.png"
        unoptimized
      />
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      src={imageSrc}
      unoptimized={unoptimized ?? shouldUseDirectImage(imageSrc)}
      className={`${props.className ?? ''} contrast-[1.08]`.trim()}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
