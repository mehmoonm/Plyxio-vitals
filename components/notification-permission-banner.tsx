'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

const DISMISS_KEY = 'notificationBannerDismissed';

export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    if (Notification.permission === 'default' && !dismissed) {
      setShow(true);
    }
  }, []);

  const enable = async () => {
    const result = await Notification.requestPermission();
    if (result !== 'default') setShow(false);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg gradient-primary-br flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium">Get appointment reminders</p>
          <p className="text-xs text-gray-400">Turn on browser notifications to be reminded before your appointments, while this app is open.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={enable} className="px-3 py-1.5 rounded-lg text-sm font-semibold gradient-primary text-white">Enable</button>
        <button onClick={dismiss} className="p-1.5 text-gray-400 hover:text-white" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
