'use client';

import React from 'react';
import { AlertTriangle, Clock, Car } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

interface BorderTaxMaintenanceProps {
  title: string;
  message: string;
  estimatedReturnTime?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const BorderTaxMaintenance: React.FC<BorderTaxMaintenanceProps> = ({
  title,
  message,
  estimatedReturnTime,
  onRetry,
  isRetrying = false,
}) => {
  const router = useRouter();

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
        </div>

        {/* Maintenance Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Status Icon */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600 leading-relaxed">{message}</p>
          </div>

          {/* Return Time */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">
                Expected return: {formatDateTime(getNextDay5AM())}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Go to Dashboard
            </Button>
            
            {onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-medium transition-colors"
              >
                {isRetrying ? 'Checking...' : 'Try Again'}
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            We are available 7 days a week
          </p>
        </div>
      </div>
    </div>
  );
};
