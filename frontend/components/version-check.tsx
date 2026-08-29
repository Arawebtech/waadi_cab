'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  AlertTriangle, 
  Sparkles, 
  Loader2, 
  RefreshCw,
  Smartphone,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { versionAPI, UpdateCheckResponse } from '@/lib/api';

const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.MP.Waadi_App';
const PLAY_STORE_PACKAGE_ID = 'com.MP.Waadi_App';

interface UpdateData {
  hasUpdate?: boolean;
  updateRequired: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  playStoreUrl?: string | null;
  releaseNotes: string;
  isForced: boolean;
  minSupportedVersion: string;
}

interface VersionCheckProps {
  children: React.ReactNode;
}

/**
 * Compare two version strings (semver, integers, or 'v'-prefixed).
 * Returns: -1 if v1 < v2, 1 if v1 > v2, 0 if v1 == v2
 */
function compareVersions(version1: string, version2: string): number {
  if (!version1 && !version2) return 0;
  if (!version1) return -1;
  if (!version2) return 1;

  const clean1 = String(version1).trim().replace(/^v/i, '');
  const clean2 = String(version2).trim().replace(/^v/i, '');

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] !== undefined ? parts1[i] : 0;
    const num2 = parts2[i] !== undefined ? parts2[i] : 0;

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  return 0;
}

/**
 * Helper to get the running app version reliably.
 */
async function resolveAppVersion(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapApp.getInfo();
      if (info && info.version && info.version !== '0.0.0') {
        return info.version;
      }
    } catch (e) {
      console.warn('⚠️ Could not read native app version:', e);
    }
  }
  return process.env.NEXT_PUBLIC_APP_VERSION || '0.1.2';
}

export const VersionCheck: React.FC<VersionCheckProps> = ({ children }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateData | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('0.1.2');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [showForceUpdateModal, setShowForceUpdateModal] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const isCheckingRef = useRef<boolean>(false);

  /**
   * Check for updates with backend API
   */
  const checkForUpdates = useCallback(async (isManualRetry = false) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    if (isManualRetry) setCheckError(null);

    try {
      const version = await resolveAppVersion();
      setCurrentVersion(version);

      const platform = Capacitor.getPlatform();
      console.log('🔍 [VersionCheck] Checking version:', { version, platform });

      const response = await versionAPI.checkForUpdate(version, platform);

      if (response && response.success && response.data) {
        const data = response.data;
        console.log('📊 [VersionCheck] Backend update response:', data);

        const latest = data.latestVersion;
        const minVersion = data.minSupportedVersion || '0.1.0';

        // Check if user is below min supported version or if forced update is active
        const isBelowMin = minVersion ? compareVersions(version, minVersion) < 0 : false;
        const isBelowLatest = latest ? compareVersions(version, latest) < 0 : false;

        const mustUpdate = Boolean(data.updateRequired) || isBelowMin || (isBelowLatest && Boolean(data.isForced));

        if (mustUpdate) {
          console.warn('🚨 [VersionCheck] Force Update REQUIRED for version:', version);
          setUpdateInfo(data);
          setShowForceUpdateModal(true);
        } else {
          console.log('✅ [VersionCheck] App version is valid and up-to-date.');
          setShowForceUpdateModal(false);
          setUpdateInfo(null);
        }
      } else {
        // Fail-open: API responded with non-success, do NOT block the app
        console.warn('⚠️ [VersionCheck] API check returned non-success, allowing normal app access.');
        if (!showForceUpdateModal) {
          setShowForceUpdateModal(false);
        }
      }
    } catch (err: any) {
      // Fail-open: Network/API error, do NOT block the app
      console.warn('⚠️ [VersionCheck] Version check error (fail-open allowed):', err?.message || err);
      if (isManualRetry) {
        setCheckError('Unable to connect to update server. Please check internet connection.');
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [showForceUpdateModal]);

  // Initial check on mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  // App resume & visibility change listeners (Requirement 4: Auto re-check when returning from Play Store)
  useEffect(() => {
    let appStateListener: any = null;

    // 1. Capacitor native app resume
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          console.log('📱 [VersionCheck] App resumed to foreground, re-checking version...');
          checkForUpdates();
        }
      }).then(l => {
        appStateListener = l;
      });
    }

    // 2. Web visibility / focus change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [VersionCheck] Tab/window visible, re-checking version...');
        checkForUpdates();
      }
    };

    const handleFocus = () => {
      console.log('🎯 [VersionCheck] Window focused, re-checking version...');
      checkForUpdates();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForUpdates]);

  // Intercept Android hardware back button when Force Update modal is active (Requirement 2: No bypass)
  useEffect(() => {
    if (!showForceUpdateModal) return;

    let backButtonListener: any = null;

    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', () => {
        console.log('🚫 [VersionCheck] Back button pressed while update is required. App exit or stay on modal.');
        // User cannot bypass the update screen.
      }).then(l => {
        backButtonListener = l;
      });
    }

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [showForceUpdateModal]);

  /**
   * Redirect user to Play Store
   */
  const handleOpenPlayStore = async () => {
    setIsRedirecting(true);
    try {
      const targetUrl = updateInfo?.playStoreUrl || DEFAULT_PLAY_STORE_URL;
      console.log('🚀 [VersionCheck] Redirecting to Play Store:', targetUrl);

      if (Capacitor.isNativePlatform()) {
        try {
          // Open native Play Store application directly
          window.location.href = `market://details?id=${PLAY_STORE_PACKAGE_ID}`;
        } catch {
          // Fallback to browser
          await Browser.open({ url: targetUrl });
        }
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error('❌ [VersionCheck] Failed to open Play Store:', e);
      window.open(DEFAULT_PLAY_STORE_URL, '_blank');
    } finally {
      setTimeout(() => {
        setIsRedirecting(false);
      }, 1500);
    }
  };

  return (
    <>
      {children}

      {/* Full-screen Non-Bypassable Force Update Overlay */}
      {showForceUpdateModal && updateInfo && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="force-update-title"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-slate-950/95 text-white backdrop-blur-xl p-6 select-none overflow-y-auto"
          style={{
            paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
            paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
          }}
        >
          {/* Top Header / Brand */}
          <div className="w-full flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold tracking-wide uppercase text-slate-300">Waadi Cab</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Update Required</span>
            </div>
          </div>

          {/* Center Content Card */}
          <div className="w-full max-w-sm my-auto flex flex-col items-center text-center py-6">
            {/* Animated Icon Glow */}
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 shadow-2xl flex items-center justify-center">
                <Download className="w-10 h-10 text-emerald-400 animate-bounce" />
              </div>
            </div>

            {/* Title & Description */}
            <h1 id="force-update-title" className="text-2xl font-bold tracking-tight text-white mb-2">
              App Update Available
            </h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              A new version of <span className="text-emerald-400 font-medium">Waadi Cab</span> is required to continue. Please update to enjoy latest features, security fixes, and seamless booking.
            </p>

            {/* Version Badges */}
            <div className="w-full grid grid-cols-2 gap-3 mb-6 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">Installed</span>
                <span className="text-sm font-semibold text-rose-400">v{currentVersion}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">Latest</span>
                <span className="text-sm font-semibold text-emerald-400">v{updateInfo.latestVersion || 'Latest'}</span>
              </div>
            </div>

            {/* Release Notes / What's New */}
            {updateInfo.releaseNotes && (
              <div className="w-full text-left p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-6">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>What&apos;s New in this Update</span>
                </div>
                <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed max-h-28 overflow-y-auto">
                  {updateInfo.releaseNotes}
                </p>
              </div>
            )}

            {/* Error banner if retry failed */}
            {checkError && (
              <div className="w-full p-2.5 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{checkError}</span>
              </div>
            )}
          </div>

          {/* Bottom Action Buttons */}
          <div className="w-full max-w-sm space-y-3 pb-2">
            <Button
              onClick={handleOpenPlayStore}
              disabled={isRedirecting}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Opening Play Store...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Update Now</span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                </>
              )}
            </Button>

            <Button
              onClick={() => checkForUpdates(true)}
              disabled={isChecking || isRedirecting}
              variant="outline"
              className="w-full h-10 bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Checking update status...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Already updated? Check Again</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default VersionCheck;
