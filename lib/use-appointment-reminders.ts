'use client';

import { useEffect, useRef } from 'react';

const REMINDER_WINDOW_MIN = 60; // notify once an appointment is within this many minutes
const CHECK_INTERVAL_MS = 60 * 1000;
const STORAGE_KEY = 'remindedAppointmentIds';

export interface UpcomingAppointmentReminder {
  id: string;
  scheduledAt: string;
  title: string;
  body: string;
}

function getRemindedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function markReminded(id: string) {
  const ids = getRemindedIds();
  ids.add(id);
  // Keep this from growing forever
  const trimmed = Array.from(ids).slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// Polls while the app is open (foreground or backgrounded tab) and fires a
// browser/OS notification for anything starting soon that hasn't already
// been reminded. This is a client-side, best-effort reminder — it only
// fires while this tab/PWA instance is running, since there's no scheduled
// server-side job wired up yet to push notifications when the app is fully
// closed.
export function useAppointmentReminders(fetchUpcoming: () => Promise<UpcomingAppointmentReminder[]>) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const check = async () => {
      if (Notification.permission !== 'granted') return;
      let upcoming: UpcomingAppointmentReminder[] = [];
      try {
        upcoming = await fetchUpcoming();
      } catch {
        return;
      }

      const reminded = getRemindedIds();
      const now = Date.now();

      for (const apt of upcoming) {
        if (reminded.has(apt.id)) continue;
        const start = new Date(apt.scheduledAt).getTime();
        const minsUntil = (start - now) / 60000;
        if (minsUntil > 0 && minsUntil <= REMINDER_WINDOW_MIN) {
          new Notification(apt.title, { body: apt.body, icon: '/icon-192.png', tag: apt.id });
          markReminded(apt.id);
        }
      }
    };

    check();
    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUpcoming]);
}
