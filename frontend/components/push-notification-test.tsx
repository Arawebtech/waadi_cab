'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pushNotificationService } from '@/lib/push-notifications';
import { base_url } from '@/environment';
import { toast } from '@/components/ui/use-toast';

export default function PushNotificationTest() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkPermissions = async () => {
    try {
      const hasPermissions = await pushNotificationService.checkPermissions();
      setPermissions(hasPermissions);
      toast({
        title: hasPermissions ? '✅ Permissions Granted' : '❌ Permissions Denied',
        description: hasPermissions ? 'Push notifications are enabled' : 'Please enable push notifications in settings',
        variant: hasPermissions ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to check permissions',
        variant: 'destructive',
      });
    }
  };

  const getFCMToken = async () => {
    try {
      const token = await pushNotificationService.getFCMToken();
      setFcmToken(token);
      if (token) {
        toast({
          title: '✅ FCM Token Retrieved',
          description: `Token: ${token.substring(0, 20)}...`,
          variant: 'default',
        });
      } else {
        toast({
          title: '❌ No FCM Token',
          description: 'FCM token not available',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to get FCM token',
        variant: 'destructive',
      });
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${base_url}/push/send-to-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Notification',
          body: 'This is a test push notification from Wadi Cab!',
          data: {
            type: 'test',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: '✅ Test Notification Sent',
          description: 'Check your device for the notification',
          variant: 'default',
        });
      } else {
        toast({
          title: '❌ Failed to Send',
          description: result.message || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearNotifications = async () => {
    try {
      await pushNotificationService.removeAllDeliveredNotifications();
      toast({
        title: '✅ Notifications Cleared',
        description: 'All delivered notifications have been removed',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to clear notifications',
        variant: 'destructive',
      });
    }
  };

  const testNotification = async () => {
    try {
      await pushNotificationService.testNotification();
      toast({
        title: '🧪 Test Sent',
        description: 'Check console for debug logs',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error testing notification:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to test notification',
        variant: 'destructive',
      });
    }
  };

  const debugState = async () => {
    try {
      await pushNotificationService.debugNotificationState();
      toast({
        title: '🔍 Debug Complete',
        description: 'Check console for debug information',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error debugging state:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to debug state',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🔔 Push Notification Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button onClick={checkPermissions} className="w-full">
            Check Permissions
          </Button>
          <div className="text-sm text-gray-600">
            Status: {permissions ? '✅ Granted' : '❌ Denied'}
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={getFCMToken} className="w-full">
            Get FCM Token
          </Button>
          {fcmToken && (
            <div className="text-xs bg-gray-100 p-2 rounded break-all">
              <strong>FCM Token:</strong><br />
              {fcmToken}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button 
            onClick={sendTestNotification} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send Test Notification'}
          </Button>
        </div>

        <div className="space-y-2">
          <Button onClick={clearNotifications} className="w-full">
            Clear All Notifications
          </Button>
        </div>

        <div className="space-y-2">
          <Button onClick={testNotification} className="w-full bg-green-600 hover:bg-green-700">
            🧪 Test Notification (Debug)
          </Button>
        </div>

        <div className="space-y-2">
          <Button onClick={debugState} className="w-full bg-blue-600 hover:bg-blue-700">
            🔍 Debug State
          </Button>
        </div>

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Check permissions first</li>
            <li>Get FCM token to verify registration</li>
            <li>Send test notification</li>
            <li>Check your device for the notification</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
