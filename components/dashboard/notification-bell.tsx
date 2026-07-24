'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Bell, Check } from 'lucide-react';

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user?.hospitalId) return;
    const { data } = await supabase
      .from('Notification')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(30);
    setNotifications(data || []);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user?.hospitalId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    await supabase.from('Notification').update({ isRead: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) await supabase.from('Notification').update({ isRead: true }).eq('id', n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
        <Bell className="w-5 h-5 text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-card rounded-2xl shadow-2xl z-50">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <p className="text-sm font-semibold text-white">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
                  <Check className="w-3 h-3" />Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-gray-400 text-sm p-6 text-center">No notifications yet</p>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => {
                  const content = (
                    <div
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className={`p-3 hover:bg-white/5 cursor-pointer ${!n.isRead ? 'bg-indigo-500/10' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{n.title}</p>
                          {n.message && <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>}
                          <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                  return n.link ? <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>{content}</Link> : <div key={n.id}>{content}</div>;
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
