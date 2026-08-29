'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { Profile, Role } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useNotifications } from '@/hooks/use-notifications';
import { useAttendanceReminders } from '@/hooks/use-attendance-reminders';
import { getSubscriptionRow } from '@/lib/billing';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  FileBarChart,
  Settings,
  ShieldCheck,
  LogOut,
  Loader2,
  Menu,
  CreditCard,
  Banknote,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const menuItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['employee', 'manager', 'hr_admin', 'super_admin'] },
  { label: 'Attendance', href: '/attendance', icon: Calendar, roles: ['employee', 'manager', 'hr_admin', 'super_admin'] },
  { label: 'Employees', href: '/employees', icon: Users, roles: ['hr_admin', 'super_admin'] },
  { label: 'Time Off', href: '/time-off', icon: Clock, roles: ['employee', 'manager', 'hr_admin', 'super_admin'] },
  { label: 'Payroll', href: '/payroll', icon: Banknote, roles: ['hr_admin', 'super_admin'] },
  { label: 'Reports', href: '/reports', icon: FileBarChart, roles: ['manager', 'hr_admin', 'super_admin'] },
];

const generalItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['employee', 'manager', 'hr_admin', 'super_admin'] },
  { label: 'Billing', href: '/billing', icon: CreditCard, roles: ['hr_admin', 'super_admin'] },
  { label: 'Security', href: '/security', icon: ShieldCheck, roles: ['super_admin'] },
  { label: 'Admin Panel', href: '/admin', icon: Shield, roles: ['super_admin'] },
];

function getInitials(p: Profile | null) {
  if (!p) return '?';
  return `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || p.email[0].toUpperCase();
}

function roleLabel(role: Role) {
  switch (role) {
    case 'employee': return 'Employee';
    case 'manager': return 'Manager';
    case 'hr_admin': return 'HR Admin';
    case 'super_admin': return 'Super Admin';
  }
}

function SidebarContent({
  pathname,
  visibleMenu,
  visibleGeneral,
  orgName,
  orgLogoUrl,
  primaryColor,
  onNavigate,
  onSignOut,
}: {
  pathname: string;
  visibleMenu: NavItem[];
  visibleGeneral: NavItem[];
  orgName: string;
  orgLogoUrl: string | null;
  primaryColor: string;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <header className="flex min-h-[50px] items-center justify-center px-5">
        <div className="flex items-center gap-2">
          {orgLogoUrl ? (
            <img src={orgLogoUrl} alt={orgName} className="h-6 w-6 rounded object-contain" />
          ) : (
            <img src="/logo.png" alt="flowHR" className="h-6 w-auto object-contain" />
          )}
          <h1 className="text-lg font-bold text-white">{orgName}</h1>
        </div>
      </header>

      <nav className="mt-8 flex flex-1 flex-col px-4 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col">
          <h2 className="mb-4 px-2 text-xs font-medium text-white/60">Menu</h2>
          <ul className="flex flex-col gap-1">
            {visibleMenu.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.label}>
                  <Link href={item.href} onClick={onNavigate}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-auto w-full justify-start gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium',
                        isActive
                          ? 'bg-white text-black hover:bg-white hover:text-black'
                          : 'bg-transparent text-white hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {visibleGeneral.length > 0 && (
          <div className="mt-8 flex flex-col">
            <h2 className="mb-4 px-2 text-xs font-medium text-white/60">General</h2>
            <ul className="flex flex-col gap-1">
              {visibleGeneral.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.label}>
                    <Link href={item.href} onClick={onNavigate}>
                      <Button
                        variant="ghost"
                        className={cn(
                          'h-auto w-full justify-start gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium',
                          isActive
                            ? 'bg-white text-black hover:bg-white hover:text-black'
                            : 'bg-transparent text-white hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Button>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="px-4 pb-2">
        <Button
          variant="ghost"
          onClick={onSignOut}
          className="w-full justify-start gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useAuth();
  const { organization } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingSub, setPendingSub] = useState<{ plan_id: string; status: string } | null>(null);

  useEffect(() => {
    if (!profile?.org_id) return;
    let cancelled = false;
    getSubscriptionRow(profile.org_id)
      .then((row) => {
        if (cancelled) return;
        setPendingSub(row?.status === 'pending' ? row : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotif,
  } = useNotifications(profile?.id);

  useAttendanceReminders(profile, null);

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.replace('/login');
        return;
      }
      if (profile.must_change_password) {
        router.replace('/change-password');
        return;
      }
      if (profile.role === 'super_admin' && !profile.org_id) {
        router.replace('/admin');
        return;
      }
    }
  }, [user, profile, loading, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading || !profile) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f2e9e9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  const visibleMenu = menuItems.filter((item) => item.roles.includes(profile.role));
  const visibleGeneral = generalItems.filter((item) => item.roles.includes(profile.role));

  const orgName = organization?.display_name || organization?.name || 'flowHR';
  const orgLogoUrl = organization?.logo_url || null;
  const primaryColor = organization?.primary_color || '#032364';

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#f2e9e9]">
      {/* Desktop Sidebar */}
      <aside className="sidebar-gradient hidden md:flex w-[190px] shrink-0 flex-col py-6">
        <SidebarContent
          pathname={pathname}
          visibleMenu={visibleMenu}
          visibleGeneral={visibleGeneral}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          primaryColor={primaryColor}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="sidebar-gradient w-[210px] p-0">
          <div className="flex h-full flex-col py-6">
            <SidebarContent
              pathname={pathname}
              visibleMenu={visibleMenu}
              visibleGeneral={visibleGeneral}
              orgName={orgName}
              orgLogoUrl={orgLogoUrl}
              primaryColor={primaryColor}
              onNavigate={() => setMobileOpen(false)}
              onSignOut={handleSignOut}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-[64px] md:h-[80px] shrink-0 items-center justify-between gap-4 bg-white px-4 md:px-8">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden rounded-lg px-2"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-[48px] w-[44px] md:h-[60px] md:w-[56px] rounded-lg shrink-0">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="rounded-lg text-base md:text-lg font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                {getInitials(profile)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs" style={{ color: primaryColor }}>Welcome</p>
              <p className="text-sm font-medium text-black truncate">
                {profile.employee_id ? `${profile.employee_id} - ` : ''}
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs font-medium text-black">{roleLabel(profile.role)}</p>
            </div>
          </div>

          <div className="ml-auto">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotif}
            />
          </div>
        </header>

        {/* Payment pending banner */}
        {pendingSub && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 md:px-8">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Your plan is awaiting payment. Features stay locked until payment is confirmed.
              </span>
            </div>
            <Link href="/billing/upgrade" className="shrink-0 text-sm font-semibold text-amber-700 underline hover:text-amber-800">
              Pay Now
            </Link>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
