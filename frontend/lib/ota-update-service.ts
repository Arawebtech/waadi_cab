import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { versionAPI } from './api';

// Get current app version from package.json
const CURRENT_VERSION = '1.1.2'; // This should match package.json version

interface UpdateInfo {
  updateRequired: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  releaseNotes: string;
  isForced: boolean;
  minSupportedVersion: string;
}

interface UpdateCheckResponse {
  success: boolean;
  data: UpdateInfo;
}

class OTAUpdateService {
  private isChecking = false;
  private isUpdating = false;

  /**
   * Check if an update is available
   */
  async checkForUpdate(): Promise<UpdateInfo | null> {
    if (this.isChecking) {
      console.log('🔄 Update check already in progress');
      return null;
    }

    this.isChecking = true;

    try {
      console.log('🔍 Checking for app updates...');
      console.log('📱 Current version:', CURRENT_VERSION);

      // Get platform info
      const platform = Capacitor.getPlatform();
      console.log('📱 Platform:', platform);

      // Call backend API to check for updates
      const result = await versionAPI.checkForUpdate(CURRENT_VERSION, platform);
      
      if (!result.success) {
        throw new Error('Failed to check for updates');
      }

      console.log('📊 Update check result:', result.data);

      return result.data;
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Download and install update
   */
  async downloadAndInstallUpdate(updateInfo: UpdateInfo): Promise<boolean> {
    if (this.isUpdating) {
      console.log('🔄 Update already in progress');
      return false;
    }

    if (!updateInfo.downloadUrl) {
      console.error('❌ No download URL provided');
      return false;
    }

    this.isUpdating = true;

    try {
      console.log('📥 Starting update download...');
      console.log('🔗 Download URL:', updateInfo.downloadUrl);
      console.log('📱 Target version:', updateInfo.latestVersion);

      // Download the update using CapacitorUpdater
      const downloadResult = await CapacitorUpdater.download({
        url: updateInfo.downloadUrl,
        version: updateInfo.latestVersion || 'unknown',
      });

      console.log('✅ Download completed:', downloadResult);

      // Set the downloaded update as active
      await CapacitorUpdater.set({ id: downloadResult.id });

      console.log('🎉 Update installed successfully!');
      console.log('🔄 App will restart to apply the update...');

      return true;
    } catch (error) {
      console.error('❌ Error downloading/installing update:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Compare two version strings
   */
  compareVersions(version1: string, version2: string): number {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    const minLength = Math.min(v1.length, v2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (v1[i] < v2[i]) {
        return -1; // version1 is older
      } else if (v1[i] > v2[i]) {
        return 1; // version1 is newer
      }
    }
    
    // If all common components are equal, the longer version is considered newer
    if (v1.length < v2.length) {
      return -1;
    } else if (v1.length > v2.length) {
      return 1;
    }
    
    return 0; // versions are equal
  }

  /**
   * Check if current version is supported
   */
  isVersionSupported(currentVersion: string, minSupportedVersion: string): boolean {
    return this.compareVersions(currentVersion, minSupportedVersion) >= 0;
  }

  /**
   * Get current app version
   */
  getCurrentVersion(): string {
    return CURRENT_VERSION;
  }

  /**
   * Check if running on native platform
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get platform name
   */
  getPlatform(): string {
    return Capacitor.getPlatform();
  }
}

// Export singleton instance
export const otaUpdateService = new OTAUpdateService();
export default otaUpdateService;
