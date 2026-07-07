'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

interface ProfileSectionCardProps {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}

export function ProfileSectionCard({ title, action, children, className }: ProfileSectionCardProps) {
  return (
    <section
 
    >
        <Card className="mobile-card overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
        {/* <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2> */}
        <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <User className="h-5 w-5 mr-2" />
              {title}
            </CardTitle>
          </CardHeader>
    
    
      {children}
      </Card>
    </section>
  );
}
