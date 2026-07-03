'use client';

import React, { ReactNode } from 'react';
import { useSafeArea } from './safe-area-provider';
import { cn } from '@/lib/utils';

interface SafeAreaViewProps {
  children: ReactNode;
  className?: string;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  padding?: boolean;
}

export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  className,
  edges = ['top', 'right', 'bottom', 'left'],
  padding = true,
}) => {
  const { safeAreaInsets, isMobile } = useSafeArea();

  if (!isMobile) {
    // On web, just render children without safe area adjustments
    return <div className={className}>{children}</div>;
  }

  const getSafeAreaStyles = () => {
    const styles: React.CSSProperties = {};
    
    if (edges.includes('top') && safeAreaInsets.top > 0) {
      styles.paddingTop = `${safeAreaInsets.top}px`;
    }
    
    if (edges.includes('right') && safeAreaInsets.right > 0) {
      styles.paddingRight = `${safeAreaInsets.right}px`;
    }
    
    if (edges.includes('bottom') && safeAreaInsets.bottom > 0) {
      styles.paddingBottom = `${safeAreaInsets.bottom}px`;
    }
    
    if (edges.includes('left') && safeAreaInsets.left > 0) {
      styles.paddingLeft = `${safeAreaInsets.left}px`;
    }

    return styles;
  };

  const safeAreaClasses = cn(
    // Base classes
    'safe-area-view',
    // Conditional classes based on edges
    edges.includes('top') && 'safe-area-top',
    edges.includes('right') && 'safe-area-right',
    edges.includes('bottom') && 'safe-area-bottom',
    edges.includes('left') && 'safe-area-left',
    // Additional padding for navigation bars
    edges.includes('bottom') && 'mobile-safe-bottom',
    className
  );

  return (
    <div 
      className={safeAreaClasses}
      style={padding ? getSafeAreaStyles() : undefined}
    >
      {children}
    </div>
  );
};

// Specialized safe area components
export const SafeAreaTop: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <SafeAreaView edges={['top']} className={className}>
    {children}
  </SafeAreaView>
);

export const SafeAreaBottom: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <SafeAreaView edges={['bottom']} className={className}>
    {children}
  </SafeAreaView>
);

export const SafeAreaHorizontal: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <SafeAreaView edges={['left', 'right']} className={className}>
    {children}
  </SafeAreaView>
);

export const SafeAreaAll: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <SafeAreaView edges={['top', 'right', 'bottom', 'left']} className={className}>
    {children}
  </SafeAreaView>
);








