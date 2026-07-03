'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  RefreshCw,
  X,
  Smartphone,
  Info
} from 'lucide-react';
import { otaUpdateService } from '@/lib/ota-update-service';

interface UpdateInfo {
  updateRequired: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  releaseNotes: string;
  isForced: boolean;
  minSupportedVersion: string;
}

interface VersionCheckProps {
  children: React.ReactNode;
}

export const VersionCheck: React.FC<VersionCheckProps> = ({ children }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);

    try {
      console.log('🔍 Checking for app updates...');
      console.log('📱 Platform:', otaUpdateService.getPlatform());
      console.log('📱 Is Native:', otaUpdateService.isNativePlatform());
      console.log('📱 Current Version:', otaUpdateService.getCurrentVersion());
      
      const updateData = await otaUpdateService.checkForUpdate();
      
      if (updateData) {
        setUpdateInfo(updateData);
        
        if (updateData.updateRequired) {
          console.log('📱 Update required:', updateData);
          setShowUpdateModal(true);
        } else {
          console.log('✅ App is up to date');
        }
      }
    } catch (err) {
      console.error('❌ Error checking for updates:', err);
      setError('Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo || !updateInfo.downloadUrl) {
      setError('No update information available');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      console.log('📥 Starting update process...');
      const success = await otaUpdateService.downloadAndInstallUpdate(updateInfo);
      
      if (success) {
        console.log('🎉 Update completed successfully');
        // The app will restart automatically after successful update
      } else {
        setError('Failed to install update. Please try again.');
      }
    } catch (err) {
      console.error('❌ Error during update:', err);
      setError('An error occurred during the update process');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkipUpdate = () => {
    if (updateInfo?.isForced) {
      // For forced updates, don't allow skipping
      return;
    }
    setShowUpdateModal(false);
  };

  const handleRetry = () => {
    checkForUpdates();
  };

  // Show update modal if update is required
  if (showUpdateModal && updateInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              {updateInfo.isForced ? (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              ) : (
                <Download className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <CardTitle className="text-xl">
              {updateInfo.isForced ? 'Update Required' : 'Update Available'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Current Version: <span className="font-medium">{otaUpdateService.getCurrentVersion()}</span>
              </p>
              <p className="text-sm text-gray-600">
                Latest Version: <span className="font-medium">{updateInfo.latestVersion}</span>
              </p>
            </div>

            {updateInfo.releaseNotes && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2">What's New:</h4>
                <p className="text-sm text-gray-600">{updateInfo.releaseNotes}</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {updateInfo.isForced && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This is a required update. You must update to continue using the app.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="w-full"
                size="lg"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Update Now
                  </>
                )}
              </Button>

              {!updateInfo.isForced && (
                <Button
                  onClick={handleSkipUpdate}
                  variant="outline"
                  className="w-full"
                  disabled={isUpdating}
                >
                  Skip for Now
                </Button>
              )}

              <Button
                onClick={handleRetry}
                variant="ghost"
                size="sm"
                disabled={isChecking || isUpdating}
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Again
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Platform: {otaUpdateService.getPlatform()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show children if no update is required or on web platform
  return <>{children}</>;
};

export default VersionCheck;

