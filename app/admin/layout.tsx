'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Profile } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  FileText,
  LogOut,
  Loader2,
  Menu,
  ArrowLeft,
  Banknote,
  Scale,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminItems: NavItem[] = [
  { label: 'Platform Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { label: 'Payments', href: '/admin/payments', icon: Banknote },
  { label: 'Reconciliation', href: '/admin/reconcile', icon: Scale },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { label: 'Invoices', href: '/admin/invoices', icon: FileText },
  { label: 'All Users', href: '/admin/users', icon: Users },
  { label: 'Audit Logs', href: '/admin/audit', icon: ShieldCheck },
];

function getInitials(p: Profile | null) {
  if (!p) return '?';
  return `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || p.email[0].toUpperCase();
}

function AdminSidebarContent({
  pathname,
  onNavigate,
  onSignOut,
  hasOrg,
}: {
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
  hasOrg: boolean;
}) {
  return (
    <>
      <header className="flex min-h-[50px] items-center justify-center px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Platform Admin</h1>
        </div>
      </header>

      <nav className="mt-8 flex flex-1 flex-col px-4 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col">
          <h2 className="mb-4 px-2 text-sm font-medium text-white/60">Administration</h2>
          <ul className="flex flex-col gap-1">
            {adminItems.map((item) => {
              const isActive = item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
              return (
                <li key={item.label}>
                  <Link href={item.href} onClick={onNavigate}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-base font-medium',
                        isActive
                          ? 'bg-white text-black hover:bg-white hover:text-black'
                          : 'bg-transparent text-white hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 flex flex-col">
          <h2 className="mb-4 px-2 text-sm font-medium text-white/60">Navigation</h2>
          <ul className="flex flex-col gap-1">
            {hasOrg && (
              <li>
                <Link href="/dashboard" onClick={onNavigate}>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-base font-medium bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <ArrowLeft className="h-5 w-5 shrink-0" />
                    Back to HR Dashboard
                  </Button>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </nav>

      <div className="px-4 pb-2">
        <Button
          variant="ghost"
          onClick={onSignOut}
          className="w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-white hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.replace('/login');
        return;
      }
      if (profile.role !== 'super_admin') {
        router.replace('/dashboard');
        return;
      }
      if (profile.must_change_password) {
        router.replace('/change-password');
        return;
      }
    }
  }, [user, profile, loading, router]);

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

  if (profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center bg-[#f2e9e9]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const hasOrg = !!profile?.org_id;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#f2e9e9]">
      {/* Desktop Sidebar */}
      <aside className="sidebar-gradient hidden md:flex w-[220px] shrink-0 flex-col py-6">
        <AdminSidebarContent
          pathname={pathname}
          onSignOut={handleSignOut}
          hasOrg={hasOrg}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="sidebar-gradient w-[260px] p-0">
          <div className="flex h-full flex-col py-6">
            <AdminSidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onSignOut={handleSignOut}
              hasOrg={hasOrg}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-[64px] md:h-[80px] shrink-0 items-center justify-between gap-4 bg-white px-4 md:px-8">
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
              <AvatarFallback className="rounded-lg text-base md:text-lg font-semibold text-white bg-[#032364]">
                {getInitials(profile)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs text-[#032364]">Platform Admin</p>
              <p className="text-sm font-medium text-black truncate">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs font-medium text-black">Super Admin</p>
            </div>
          </div>

          {hasOrg && (
            <div className="ml-auto">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="rounded-lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  HR Dashboard
                </Button>
              </Link>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
