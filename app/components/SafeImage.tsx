'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { canOptimizeImage } from '@/lib/imageDelivery';

type SafeImageProps = ImageProps & {
  fallbackClassName?: string;
  fallbackLabel?: string;
  fallbackSrc?: string;
};

function ImageWithFallback({
  alt,
  fallbackSrc = '/placeholder.png',
  onError,
  src,
  unoptimized,
  ...props
}: ImageProps & { fallbackSrc?: string }) {
  const [stage, setStage] = useState(0);
  const fallbackImageSrc = fallbackSrc.trim().length > 0 ? fallbackSrc : '/placeholder.png';
  const original = typeof src === 'string' && !src.trim() ? fallbackImageSrc : src;
  const optimized = unoptimized !== true && (typeof original !== 'string' || canOptimizeImage(original));

  return (
    <Image
      {...props}
      alt={alt}
      src={stage === 2 ? fallbackImageSrc : original}
      unoptimized={!optimized || stage > 0}
      onError={(event) => {
        // An optimizer limit must not hide a working original photograph.
        setStage((current) => current === 0 && optimized ? 1 : 2);
        onError?.(event);
      }}
    />
  );
}

export default function SafeImage({ fallbackClassName, fallbackLabel, ...props }: SafeImageProps) {
  void fallbackClassName;
  void fallbackLabel;
  const sourceKey = typeof props.src === 'string' ? props.src : JSON.stringify(props.src);
  return <ImageWithFallback key={`${sourceKey}:${props.fallbackSrc}`} {...props} />;
}
