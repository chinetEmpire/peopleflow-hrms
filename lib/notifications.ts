import { getSupabase, NotificationRecord, NotificationType } from './supabase';

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  metadata: Record<string, unknown> = {},
  orgId?: string
): Promise<NotificationRecord | null> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .insert({ user_id: userId, org_id: orgId, title, body, type, metadata })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
  return data;
}

export async function getNotifications(userId: string, orgId?: string): Promise<NotificationRecord[]> {
  let query = getSupabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId);

  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
  return data ?? [];
}

export async function getUnreadCount(userId: string, orgId?: string): Promise<number> {
  let query = getSupabase()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (orgId) query = query.eq('org_id', orgId);

  const { count, error } = await query;

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
