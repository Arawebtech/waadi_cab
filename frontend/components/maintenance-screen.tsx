'use client';

import React from 'react';
import { AlertTriangle, Clock, RefreshCw, Car, Shield } from 'lucide-react';
import { Button } from './ui/button';

interface MaintenanceScreenProps {
  title: string;
  message: string;
  estimatedReturnTime?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  title,
  message,
  estimatedReturnTime,
  onRetry,
  isRetrying = false,
}) => {
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return "5:00 AM";
    }
  };

  const getNextDay5AM = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(5, 0, 0, 0);
    return tomorrow.toISOString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Wadi Cab</h1>
          <p className="text-sm text-gray-600">Border Pass Service</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
          {/* Status Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-10 h-10 text-orange-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {title || "We're Temporarily Closed"}
          </h2>

          {/* Message */}
          <div className="mb-6">
            <p className="text-gray-600 leading-relaxed text-center">
              {message || "We are currently closed and will open at 5:00 AM. We are available 7 days a week. Thank you for your patience."}
            </p>
          </div>

          {/* Estimated Return Time */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
            <div className="flex items-center justify-center text-blue-700">
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                Expected return: {formatDateTime(getNextDay5AM())}
              </span>
            </div>
          </div>

          {/* Retry Button */}
          {onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </>
              )}
            </Button>
          )}

          {/* Security Badge */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center text-gray-500">
              <Shield className="w-4 h-4 mr-2" />
              <span className="text-xs">Your data is secure</span>
            </div>
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            We apologize for any inconvenience. Our team is working to serve you better.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
