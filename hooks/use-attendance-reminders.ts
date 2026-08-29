'use client';

import { useEffect, useCallback } from 'react';
import { Profile, AttendanceRecord } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { requestNotificationPermission } from '@/lib/push-notifications';

function reminderKey(type: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `reminder_${type}_${today}`;
}

function hasReminderFired(type: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(reminderKey(type)) === '1';
}

function markReminderFired(type: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(reminderKey(type), '1');
}

export function useAttendanceReminders(
  profile: Profile | null,
  todayRecord: AttendanceRecord | null,
) {
  const checkReminders = useCallback(async () => {
    if (!profile) return;

    // Request notification permission on first meaningful check
    requestNotificationPermission();

    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();

    // Check-in reminder: after 8:30 AM, if not checked in today
    if ((hour > 8 || (hour === 8 && min >= 30)) && !todayRecord?.check_in) {
      if (!hasReminderFired('check_in')) {
        markReminderFired('check_in');
        await createNotification(
          profile.id,
          'Good Morning!',
          'Time to check in for today. Tap the attendance page to get started.',
          'check_in_reminder',
          {},
          profile.org_id,
        );
      }
    }

    // Check-out reminder: after 5:00 PM, if checked in but not out
    if (hour >= 17 && todayRecord?.check_in && !todayRecord?.check_out) {
      if (!hasReminderFired('check_out')) {
        markReminderFired('check_out');
        await createNotification(
          profile.id,
          'Time to Check Out',
          "You checked in today but haven't checked out yet. Don't forget to clock out!",
          'check_out_reminder',
          {},
          profile.org_id,
        );
      }
    }
  }, [profile, todayRecord]);

  // Check on mount and every 60 seconds
  useEffect(() => {
    checkReminders();
    const timer = setInterval(checkReminders, 60_000);
    return () => clearInterval(timer);
  }, [checkReminders]);
}
