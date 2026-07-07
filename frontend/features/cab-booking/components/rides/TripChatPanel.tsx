'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchRideMessages, sendRideMessage } from '../../api';
import { joinRideRoom, onCabChat } from '../../services/cab-socket';
import { format } from 'date-fns';

interface Message {
  _id: string;
  message: string;
  senderRole: string;
  createdAt: string;
  rideId?: string;
}

function appendMessage(prev: Message[], msg: Message) {
  const id = msg._id;
  if (id && prev.some((m) => m._id === id)) return prev;
  return [...prev, msg];
}

export function TripChatPanel({
  rideId,
  open,
  onClose,
}: {
  rideId: string;
  open: boolean;
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !rideId) return;
    joinRideRoom(rideId);
    setLoading(true);
    fetchRideMessages(rideId)
      .then(setMessages)
      .finally(() => setLoading(false));
    const unsub = onCabChat((msg) => {
      if (String(msg.rideId) === rideId) {
        setMessages((prev) => appendMessage(prev, msg as Message));
      }
    });
    return unsub;
  }, [open, rideId]);

  useEffect(() => {
    if (collapsed) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, collapsed]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await sendRideMessage(rideId, trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Chat with customer</p>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {collapsed ? 'Expand' : 'Collapse'}
          </Button>
          {onClose && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-y-contain space-y-2 p-3 min-h-[120px]">
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground py-4">No messages yet</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m._id}
                  className={`text-sm rounded-lg px-3 py-1.5 max-w-[85%] ${
                    m.senderRole === 'driver'
                      ? 'ml-auto bg-black text-white w-fit'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <p>{m.message}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{format(new Date(m.createdAt), 'HH:mm')}</p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t p-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button size="icon" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
