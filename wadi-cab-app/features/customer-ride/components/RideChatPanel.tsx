'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Send } from 'lucide-react';
import { customerBookingApi } from '../api/booking';
import { onRideChat } from '../socket';
import type { ChatMessage } from '../types';
import { useCustomerRide } from '../context/CustomerRideProvider';

interface Props {
  rideId: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function appendMessage(prev: ChatMessage[], msg: ChatMessage) {
  const id = msg._id;
  if (id && prev.some((m) => m._id === id)) return prev;
  return [...prev, msg];
}

export function RideChatPanel({ rideId, collapsed = false, onToggleCollapse }: Props) {
  const { user } = useCustomerRide();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    customerBookingApi
      .getMessages(rideId)
      .then((items) => setMessages(items as ChatMessage[]))
      .finally(() => setLoading(false));
  }, [rideId]);

  useEffect(() => {
    const unsub = onRideChat((msg) => {
      if (String(msg.rideId) !== rideId) return;
      setMessages((prev) => appendMessage(prev, msg as ChatMessage));
    });
    return () => {
      unsub();
    };
  }, [rideId]);

  useEffect(() => {
    if (collapsed) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, collapsed]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);
    try {
      await customerBookingApi.sendMessage(rideId, trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Chat
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      )}

      {!collapsed && (
        <>
          <div className="max-h-56 flex-1 space-y-2 overflow-y-auto overscroll-y-contain p-3 min-h-[120px]">
            {loading && <p className="text-center text-sm text-slate-400">Loading chat…</p>}
            {messages.map((m) => {
              const mine = m.senderRole === 'customer' || m.senderId === user?.id;
              return (
                <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? 'bg-black text-white' : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 p-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message driver"
              className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
