'use client';

import {
  Clock,
  LogOut,
  CheckCircle2,
  XCircle,
  BellOff,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { NotificationRecord } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  notifications: NotificationRecord[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

function notificationIcon(type: NotificationRecord['type']) {
  switch (type) {
    case 'check_in_reminder':
      return <Clock className="h-4 w-4 text-blue-500 shrink-0" />;
    case 'check_out_reminder':
      return <LogOut className="h-4 w-4 text-orange-500 shrink-0" />;
    case 'leave_approved':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case 'leave_rejected':
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  }
}

export function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <DropdownMenuContent align="end" className="w-[360px] p-0">
      <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-[#051536]">Notifications</span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-[#032364] hover:text-[#032364]/80"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAllAsRead();
            }}
          >
            Mark all as read
          </Button>
        )}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4">
          <BellOff className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          {notifications.map((notif) => (
            <DropdownMenuItem
              key={notif.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer rounded-none border-b border-border/50 last:border-0',
                !notif.read_at && 'bg-[#032364]/[0.03]',
              )}
              onClick={() => {
                if (!notif.read_at) onMarkAsRead(notif.id);
              }}
            >
              <div className="mt-0.5">{notificationIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm leading-tight',
                    !notif.read_at ? 'font-semibold text-[#051536]' : 'font-medium text-[#051536]/80',
                  )}
                >
                  {notif.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {notif.body}
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0 mt-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notif.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      )}
    </DropdownMenuContent>
  );
}
