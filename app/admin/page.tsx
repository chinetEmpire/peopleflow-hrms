'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  FolderOpen,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalDepartments: number;
  planBreakdown: { plan: string; count: number }[];
  recentSignups: any[];
}

export default function AdminDashboardPage() {
  const { profile, session } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error('Failed to load admin stats', e);
      } finally {
        setLoading(false);
      }
    }

    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }
    loadStats();
  }, [session]);

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
      </div>
    );
  }

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor your HR platform health and usage</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Organizations</p>
                <p className="text-2xl font-semibold text-[#051536]">{stats?.totalOrganizations ?? 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#032364]/10">
                <Building2 className="h-6 w-6 text-[#032364]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-semibold text-[#051536]">{stats?.totalUsers ?? 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-semibold text-[#051536]">{stats?.activeUsers ?? 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-semibold text-[#051536]">{stats?.totalDepartments ?? 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                <FolderOpen className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Plan Distribution */}
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[#051536] mb-4">Plan Distribution</h3>
            {stats?.planBreakdown && stats.planBreakdown.length > 0 ? (
              <div className="space-y-3">
                {stats.planBreakdown.map((item) => (
                  <div key={item.plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={planColors[item.plan] ?? 'bg-gray-100 text-gray-700'}>
                        {item.plan.charAt(0).toUpperCase() + item.plan.slice(1)}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium text-[#051536]">{item.count} org{item.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No organizations yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[#051536] mb-4">Recent Signups</h3>
            {stats?.recentSignups && stats.recentSignups.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSignups.map((user: any) => (
                  <div key={user.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#032364] text-sm font-semibold text-white shrink-0">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#051536]">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent signups.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-[#051536] mb-4">Platform Health</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#051536]">Active Rate</p>
                <p className="text-lg font-semibold text-[#051536]">
                  {stats && stats.totalUsers > 0
                    ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}%`
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#051536]">Avg Users/Org</p>
                <p className="text-lg font-semibold text-[#051536]">
                  {stats && stats.totalOrganizations > 0
                    ? Math.round(stats.totalUsers / stats.totalOrganizations)
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <UserX className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#051536]">Inactive Users</p>
                <p className="text-lg font-semibold text-[#051536]">{stats?.inactiveUsers ?? 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
