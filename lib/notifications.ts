import { getSupabase, NotificationRecord, NotificationType } from './supabase';

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  metadata: Record<string, unknown> = {},
): Promise<NotificationRecord | null> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .insert({ user_id: userId, title, body, type, metadata })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
  return data;
}

export async function getNotifications(userId: string): Promise<NotificationRecord[]> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
  return data ?? [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Failed to mark all as read:', error);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to delete notification:', error);
  }
}
