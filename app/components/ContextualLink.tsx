'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ComponentProps } from 'react';
import { getBrowseContextQuery, withBrowseContext } from '@/lib/browseContext';

type ContextualLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

function ContextualLinkInner({ href, ...props }: ContextualLinkProps) {
  const searchParams = useSearchParams();
  const browseContextQuery = getBrowseContextQuery(searchParams);

  return <Link href={withBrowseContext(href, browseContextQuery)} {...props} />;
}

export default function ContextualLink({ href, ...props }: ContextualLinkProps) {
  return (
    <Suspense fallback={<Link href={href} {...props} />}>
      <ContextualLinkInner href={href} {...props} />
    </Suspense>
  );
}
