'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  href?: string;
  label?: string;
  className?: string;
}

export function PageBackButton({ href, label = 'Back', className }: Props) {
  const router = useRouter();
  const styles = cn(
    'mb-4 inline-flex items-center gap-2 rounded-lg py-1.5 pr-2 text-sm font-medium',
    'text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
    'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
    className
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        <ArrowLeft className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={styles}>
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
