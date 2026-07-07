'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, User, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/ride', label: 'Home', icon: Home },
  { href: '/ride/history', label: 'Trips', icon: Clock },
  { href: '/ride/intercity', label: 'Outstation', icon: Map },
  { href: '/ride/profile', label: 'Account', icon: User },
];

export function RideTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/ride' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                active ? 'text-black' : 'text-slate-400'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
