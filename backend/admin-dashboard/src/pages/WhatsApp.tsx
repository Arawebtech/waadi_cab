import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Send,
  QrCode,
  CheckCircle,
  AlertCircle,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import AdminAPI from '../services/api';

interface WhatsAppStatus {
  isConnected: boolean;
  isReady: boolean;
  qrCodeAvailable: boolean;
  lastStatus?: string;
}

interface WhatsAppTestMessage {
  phoneNumber: string;
  message: string;
  sent: boolean;
}

const WhatsApp: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<WhatsAppTestMessage | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const statusData = await AdminAPI.getWhatsAppStatus();
      setStatus(statusData);
    } catch (err) {
      console.error('Error loading WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async () => {
    try {
      setReconnecting(true);
      const result = await AdminAPI.reconnectWhatsApp();
      setStatus(prev => prev ? { ...prev, ...result } : null);
    } catch (err) {
      console.error('Error reconnecting WhatsApp:', err);
    } finally {
      setReconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await AdminAPI.disconnectWhatsApp();
      setStatus(prev => prev ? { ...prev, ...result } : null);
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
    }
  };

  const handleTestMessage = async () => {
    if (!testPhone.trim()) {
      alert('Please enter a phone number');
      return;
    }

    try {
      const result = await AdminAPI.sendTestMessage(testPhone, testMessage);
      setTestResult(result);
    } catch (err) {
      console.error('Error sending test message:', err);
      setTestResult({
        phoneNumber: testPhone,
        message: testMessage,
        sent: false
      });
    }
  };

  const handleShowQR = async () => {
    setShowQR(true);
    setQrLoading(true);
    await loadQRCode();
  };

  const loadQRCode = async () => {
    try {
      const qrData = await AdminAPI.getQRCode();
      if (qrData.connected) {
        setQrCode('');
        setQrLoading(false);
        return;
      }

      if (qrData.qrCode) {
        setQrCode(qrData.qrCode);
        setQrLoading(false);
      } else {
        setQrLoading(true);
        // Retry after 2 seconds
        setTimeout(loadQRCode, 2000);
      }
    } catch (err) {
      console.error('Error loading QR code:', err);
      setQrLoading(false);
    }
  };

  const openStandaloneQR = () => {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:4001/api/v1';
    const url = `${base.replace(/\/$/, '')}/whatsapp/qr-page`;
    window.open(url, '_blank', 'noopener');
  };

  const getStatusColor = () => {
    if (!status) return 'gray';
    if (status.isConnected && status.isReady) return 'green';
    if (status.isConnected) return 'yellow';
    return 'red';
  };

  const getStatusText = () => {
    if (!status) return 'Unknown';
    if (status.isConnected && status.isReady) return 'Connected';
    if (status.isConnected) return 'Connecting';
    return 'Disconnected';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            WhatsApp Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage WhatsApp connection and send test messages.
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={loadStatus}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={openStandaloneQR}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            title="Open standalone QR page"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open QR Page
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${
              getStatusColor() === 'green' ? 'bg-green-100' :
              getStatusColor() === 'yellow' ? 'bg-yellow-100' :
              getStatusColor() === 'red' ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              {status?.isConnected ? (
                <Wifi className={`h-6 w-6 ${
                  getStatusColor() === 'green' ? 'text-green-600' :
                  getStatusColor() === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                }`} />
              ) : (
                <WifiOff className="h-6 w-6 text-gray-600" />
              )}
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Connection Status</h3>
              <p className={`text-lg font-bold ${
                getStatusColor() === 'green' ? 'text-green-600' :
                getStatusColor() === 'yellow' ? 'text-yellow-600' :
                getStatusColor() === 'red' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {getStatusText()}
              </p>
              {status && (
                <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                  <p><strong>isConnected:</strong> {String(status.isConnected)}</p>
                  <p><strong>isReady:</strong> {String(status.isReady)}</p>
                  {status.lastStatus && (
                    <p><strong>lastStatus:</strong> {status.lastStatus}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Service Status</h3>
              <p className="text-lg font-bold text-gray-900">
                {status?.isReady ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">QR Code</h3>
              <p className="text-sm font-medium text-gray-900">
                {status?.qrCodeAvailable ? 'Available' : 'Not Available'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Connection Management</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center disabled:opacity-50"
            >
              {reconnecting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              {reconnecting ? 'Reconnecting...' : 'Reconnect'}
            </button>
            <button
              onClick={handleDisconnect}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
            >
              <WifiOff className="h-4 w-4 mr-2" />
              Disconnect
            </button>
            <button
              onClick={handleShowQR}
              disabled={qrLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
            >
              {qrLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4 mr-2" />
              )}
              {qrLoading ? 'Loading QR...' : 'Show QR Code'}
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Display */}
      {showQR && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">QR Code Authentication</h3>
          </div>
          <div className="p-6">
            <div className="text-center">
              <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
                {qrCode ? (
                  <img src={`data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="w-64 h-64" />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                    <QrCode className="h-32 w-32 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {qrCode ? 'Scan this QR code with WhatsApp → Settings → Linked Devices' : 'Waiting for QR code...'}
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Hide QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Messages */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Send Test Message</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Enter phone number (e.g., 7042414212)"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message (Optional)
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter custom message or leave empty for default test message"
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleTestMessage}
              disabled={!testPhone.trim() || !status?.isReady}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test Message
            </button>
            {!status?.isReady && (
              <p className="text-xs text-red-600">WhatsApp is not ready. Use the Reconnect button and scan the QR code to connect.</p>
            )}
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 rounded-lg ${
          testResult.sent ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {testResult.sent ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            )}
            <h4 className={`text-sm font-medium ${
              testResult.sent ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.sent ? 'Message Sent Successfully' : 'Failed to Send Message'}
            </h4>
          </div>
          <div className="mt-2 text-sm">
            <p><strong>Phone:</strong> {testResult.phoneNumber}</p>
            <p><strong>Message:</strong> {testResult.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsApp;
