'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SafeAreaViewProps {
  children: ReactNode;
  className?: string;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

/**
 * Applies safe-area padding via CSS env() only — never stacks inline + class padding.
 */
export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  className,
  edges = ['top', 'right', 'bottom', 'left'],
}) => {
  const safeAreaClasses = cn(
    'safe-area-view',
    edges.includes('top') && 'safe-area-top',
    edges.includes('right') && 'safe-area-right',
    edges.includes('bottom') && 'safe-area-bottom',
    edges.includes('left') && 'safe-area-left',
    edges.includes('bottom') && 'mobile-safe-bottom',
    className
  );

  return <div className={safeAreaClasses}>{children}</div>;
};

export const SafeAreaTop: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <SafeAreaView edges={['top']} className={className}>
    {children}
  </SafeAreaView>
);

export const SafeAreaBottom: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <SafeAreaView edges={['bottom']} className={className}>
    {children}
  </SafeAreaView>
);

export const SafeAreaHorizontal: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <SafeAreaView edges={['left', 'right']} className={className}>
    {children}
  </SafeAreaView>
);

export const SafeAreaAll: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <SafeAreaView edges={['top', 'right', 'bottom', 'left']} className={className}>
    {children}
  </SafeAreaView>
);
