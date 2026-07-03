'use client';

import { useEffect } from 'react';
import { versionTrackingAPI } from '@/lib/api';

interface VersionTrackerProps {
  userId: string;
  platform?: 'android' | 'ios' | 'web';
}

export const VersionTracker: React.FC<VersionTrackerProps> = ({ userId, platform = 'web' }) => {
  useEffect(() => {
    const trackVersion = async () => {
      try {
        // Get version from package.json (this would be set during build)
        const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.2';
        
        console.log('📱 Tracking app version:', { userId, appVersion, platform });
        
        const result = await versionTrackingAPI.trackVersion({
          userId,
          appVersion,
          platform
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

