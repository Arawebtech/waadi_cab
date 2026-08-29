'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { versionTrackingAPI } from '@/lib/api';

interface VersionTrackerProps {
  userId: string;
  platform?: 'android' | 'ios' | 'web';
}

export const VersionTracker: React.FC<VersionTrackerProps> = ({ userId, platform = 'web' }) => {
  useEffect(() => {
    const trackVersion = async () => {
      try {
        let appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.2';
        let detectedPlatform = platform;

        if (Capacitor.isNativePlatform()) {
          try {
            const info = await CapApp.getInfo();
            if (info && info.version && info.version !== '0.0.0') {
              appVersion = info.version;
            }
            detectedPlatform = Capacitor.getPlatform() as 'android' | 'ios';
          } catch (e) {
            console.warn('⚠️ Could not read native app version in tracker:', e);
          }
        }
        
        console.log('📱 Tracking app version:', { userId, appVersion, platform: detectedPlatform });
        
        const result = await versionTrackingAPI.trackVersion({
          userId,
          appVersion,
          platform: detectedPlatform
        });
        
        if (result.success) {
          console.log('✅ Version tracked successfully:', result.data);
        } else {
          console.error('❌ Failed to track version:', result.message);
        }
      } catch (error) {
        console.error('❌ Version tracking error:', error);
      }
    };

    // Only track if we have a valid userId
    if (userId && userId !== 'undefined') {
      trackVersion();
    }
  }, [userId, platform]);

  // This component doesn't render anything
  return null;
};

export default VersionTracker;

