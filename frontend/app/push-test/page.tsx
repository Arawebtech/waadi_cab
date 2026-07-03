import PushNotificationTest from '@/components/push-notification-test';

export default function PushTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔔 Push Notification Test
          </h1>
          <p className="text-gray-600">
            Test push notifications for your Wadi Cab app
          </p>
        </div>
        
        <PushNotificationTest />
        
        <div className="mt-8 max-w-md mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Setup Instructions</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Add Firebase configuration to your project</li>
              <li>Update environment variables in backend</li>
              <li>Build and run the app on a real device</li>
              <li>Grant notification permissions</li>
              <li>Test notifications using this page</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
