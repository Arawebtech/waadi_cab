import React, { useState } from 'react';
import AdminAPI from '../services/api';

const Notifications: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<'insurance' | 'booking' | 'border-tax' | 'admin-broadcast' | 'admin-direct'>('booking');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const sendToAll = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4001/api/v1';
      const res = await fetch(`${apiUrl}/push/send-to-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, data: { type } })
      });
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    } finally {
      setIsSending(false);
    }
  };

  const sendToUser = async () => {
    if (!userId.trim()) {
      setResult('Please enter a userId');
      return;
    }
    setIsSending(true);
    setResult(null);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4001/api/v1';
      const res = await fetch(`${apiUrl}/push/send-to-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, body, data: { type } })
      });
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Send Push Notifications</h2>
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input className="mt-1 w-full border rounded px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Body</label>
          <textarea className="mt-1 w-full border rounded px-3 py-2" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select className="mt-1 w-full border rounded px-3 py-2" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="booking">Booking</option>
              <option value="insurance">Insurance</option>
              <option value="border-tax">Border Tax</option>
              <option value="admin-broadcast">Admin Broadcast</option>
              <option value="admin-direct">Admin Direct</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Controls where the app navigates on click.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">User ID (optional)</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Enter user ID to send direct" />
            <p className="text-xs text-gray-500 mt-1">Leave empty to send to all users</p>
          </div>
          <div className="flex gap-2">
            <button onClick={sendToAll} disabled={isSending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              {isSending ? 'Sending...' : 'Send to All'}
            </button>
            <button onClick={sendToUser} disabled={isSending} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
              {isSending ? 'Sending...' : 'Send to User'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="mt-4 bg-gray-900 text-gray-100 rounded p-3 text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
};

export default Notifications;
