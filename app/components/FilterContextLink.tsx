'use client';

import { Suspense, type ComponentProps } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { withFilterContext } from '@/lib/filterContext';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function FilterContextLinkInner({ href, ...props }: Props) {
  const params = useSearchParams();
  const pathname = usePathname();
  return <Link {...props} href={withFilterContext(href, new URLSearchParams(params.toString()), pathname)} />;
}

export default function FilterContextLink(props: Props) {
  return <Suspense fallback={<Link {...props} />}><FilterContextLinkInner {...props} /></Suspense>;
}
