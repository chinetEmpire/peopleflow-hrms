'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, NotificationRecord } from '@/lib/supabase';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/lib/notifications';
import { showBrowserNotification, playNotificationSound } from '@/lib/push-notifications';

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [notifs, count] = await Promise.all([
      getNotifications(userId),
      getUnreadCount(userId),
    ]);
    setNotifications(notifs);
    setUnreadCount(count);
    setLoading(false);
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = getSupabase()
      .channel('my-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationRecord;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
          playNotificationSound();
          showBrowserNotification(newNotif.title, newNotif.body);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        getSupabase().removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!userId) return;
    await markAllAsRead(userId);
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
    setUnreadCount(0);
  }, [userId]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => {
      const wasUnread = notifications.find((n) => n.id === id && !n.read_at);
      return wasUnread ? Math.max(0, prev - 1) : prev;
    });
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDelete,
    refresh,
  };
}
