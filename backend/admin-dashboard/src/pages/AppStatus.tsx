import React, { useState, useEffect } from 'react';
import {
  Power,
  Settings,
  AlertTriangle,
  Clock,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Bell
} from 'lucide-react';
import AdminAPI from '../services/api';

interface AppSettings {
  id: string;
  appStatus: 'online' | 'maintenance';
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceTitle: string;
  estimatedReturnTime?: string;
  platformFee: number;
  lastUpdatedBy?: string;
  lastUpdated: string;
  createdAt: string;
}

const AppStatus: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState({
    message: '',
    title: '',
    estimatedReturnTime: ''
  });
  const [platformFee, setPlatformFee] = useState(20);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Use public endpoint for testing
      const apiUrl = process.env.REACT_APP_API_URL || 'https://api.waadi.in/api/v1';
      const response = await fetch(`${apiUrl}/app-settings-public`);
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setMaintenanceData({
          message: data.data.maintenanceMessage || '',
          title: data.data.maintenanceTitle || '',
          estimatedReturnTime: data.data.estimatedReturnTime ? 
            new Date(data.data.estimatedReturnTime).toISOString().slice(0, 16) : ''
        });
        setPlatformFee(data.data.platformFee || 20);
      } else {
        throw new Error(data.message || 'Failed to load app settings');
      }
    } catch (err) {
      console.error('Error loading app settings:', err);
      alert('Failed to load app settings. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!settings) {
      alert('Settings not loaded. Please refresh the page.');
      return;
    }

    try {
      setSaving(true);
      const newStatus = settings.appStatus === 'online' ? 'maintenance' : 'online';
      
      if (newStatus === 'maintenance') {
        // Validate maintenance data
        if (!maintenanceData.message.trim() || !maintenanceData.title.trim()) {
          alert('Please fill in maintenance message and title before switching to maintenance mode');
          setSaving(false);
          return;
        }
      }

      // Use public endpoint for testing
      const apiUrl = process.env.REACT_APP_API_URL || 'https://api.waadi.in/api/v1';
      const response = await fetch(`${apiUrl}/app-settings-toggle-public`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          maintenanceMessage: newStatus === 'maintenance' ? maintenanceData.message : (maintenanceData.message || ''),
          maintenanceTitle: newStatus === 'maintenance' ? maintenanceData.title : (maintenanceData.title || ''),
          estimatedReturnTime: newStatus === 'maintenance' ? (maintenanceData.estimatedReturnTime || null) : null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        alert(`App status changed to ${newStatus}`);
        // Reload settings to get the latest data
        await loadSettings();
      } else {
        throw new Error(data.message || 'Failed to toggle app status');
      }
    } catch (err: any) {
      console.error('Error toggling app status:', err);
      alert(`Failed to update app status: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMaintenance = async () => {
    try {
      setSaving(true);
      
      // Use public endpoint for testing
      const apiUrl = process.env.REACT_APP_API_URL || 'https://api.waadi.in/api/v1';
      const response = await fetch(`${apiUrl}/app-settings-update-maintenance-public`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maintenanceMessage: maintenanceData.message,
          maintenanceTitle: maintenanceData.title,
          estimatedReturnTime: maintenanceData.estimatedReturnTime || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        alert('Maintenance message updated successfully');
      } else {
        throw new Error(data.message || 'Failed to update maintenance message');
      }
    } catch (err: any) {
      console.error('Error updating maintenance message:', err);
      alert(`Failed to update maintenance message: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlatformFee = async () => {
    try {
      setSaving(true);
      
      // Use public endpoint for testing
      const apiUrl = process.env.REACT_APP_API_URL || 'https://api.waadi.in/api/v1';
      const response = await fetch(`${apiUrl}/app-settings-update-platform-fee-public`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platformFee: platformFee
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        alert('Platform fee updated successfully');
      } else {
        throw new Error(data.message || 'Failed to update platform fee');
      }
    } catch (err: any) {
      console.error('Error updating platform fee:', err);
      alert(`Failed to update platform fee: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            App Status Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Control app availability and maintenance notifications.
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={loadSettings}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Current App Status</h3>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {settings?.appStatus === 'online' ? (
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500 mr-3" />
              )}
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  {settings?.appStatus === 'online' ? 'App is Online' : 'App is in Maintenance Mode'}
                </h4>
                <p className="text-sm text-gray-500">
                  Last updated: {settings ? formatDateTime(settings.lastUpdated) : 'Unknown'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleStatus}
              disabled={saving}
              className={`px-6 py-3 rounded-md font-medium flex items-center ${
                settings?.appStatus === 'online'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Power className="h-4 w-4 mr-2" />
              {saving ? 'Updating...' : settings?.appStatus === 'online' ? 'Turn Off App' : 'Turn On App'}
            </button>
          </div>
        </div>
      </div>

      {/* Platform Fee Settings */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Platform Fee Settings
          </h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform Fee (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={platformFee}
              onChange={(e) => setPlatformFee(Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter platform fee amount"
            />
            <p className="text-sm text-gray-500 mt-1">
              This fee will be added to all border tax bookings
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleUpdatePlatformFee}
              disabled={saving || platformFee < 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Updating...' : 'Update Platform Fee'}
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance Settings */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Maintenance Settings
          </h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maintenance Title
            </label>
            <input
              type="text"
              value={maintenanceData.title}
              onChange={(e) => setMaintenanceData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., App Maintenance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maintenance Message
            </label>
            <textarea
              value={maintenanceData.message}
              onChange={(e) => setMaintenanceData(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., We are currently under maintenance. We will be back at 5am in the morning."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Return Time
            </label>
            <input
              type="datetime-local"
              value={maintenanceData.estimatedReturnTime}
              onChange={(e) => setMaintenanceData(prev => ({ ...prev, estimatedReturnTime: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleUpdateMaintenance}
              disabled={saving || !maintenanceData.message.trim() || !maintenanceData.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Updating...' : 'Update Maintenance Message'}
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance Preview */}
      {settings?.appStatus === 'maintenance' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-lg font-medium text-yellow-800 mb-2">
                {settings.maintenanceTitle}
              </h4>
              <p className="text-yellow-700 mb-3">
                {settings.maintenanceMessage}
              </p>
              {settings.estimatedReturnTime && (
                <div className="flex items-center text-yellow-700">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    Expected return: {formatDateTime(settings.estimatedReturnTime)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Bell className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-lg font-medium text-blue-800 mb-2">
              Notification Behavior
            </h4>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>• When app is turned off, all states are automatically disabled</li>
              <li>• Users trying to book will see the maintenance message</li>
              <li>• Firebase notifications are sent to all users when maintenance mode is activated</li>
              <li>• Users who open the app during maintenance will receive a push notification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppStatus;
