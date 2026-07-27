'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Mail,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserX,
  UserCheck,
} from 'lucide-react';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  org_id: string;
  is_active: boolean;
  job_title: string | null;
  created_at: string;
  organization?: { name: string; slug: string } | null;
}

export default function AdminUsersPage() {
  const { profile, session } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (roleFilter) params.set('role', roleFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    setPage(1);
    await loadUsers();
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ id: userId, role: newRole }),
      });

      if (res.ok) {
        setUsers(users.map((u) => u.id === userId ? { ...u, role: newRole } : u));
        toast.success('Role updated successfully');
      } else {
        toast.error('Failed to update role');
      }
    } catch {
      toast.error('Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleActive(userId: string, currentActive: boolean) {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ id: userId, is_active: !currentActive }),
      });

      if (res.ok) {
        setUsers(users.map((u) => u.id === userId ? { ...u, is_active: !currentActive } : u));
        toast.success(`User ${currentActive ? 'deactivated' : 'activated'} successfully`);
      } else {
        toast.error('Failed to update user');
      }
    } catch {
      toast.error('Failed to update user');
    } finally {
      setUpdatingId(null);
    }
  }

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  const roleBadge: Record<string, string> = {
    employee: 'bg-gray-100 text-gray-700',
    manager: 'bg-blue-100 text-blue-700',
    hr_admin: 'bg-purple-100 text-purple-700',
    super_admin: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">All Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage users across all organizations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="rounded-lg pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Roles</option>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="hr_admin">HR Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <Button onClick={handleSearch} variant="outline" className="rounded-lg">
          Search
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {total} user{total !== 1 ? 's' : ''} found
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
        </div>
      ) : users.length === 0 ? (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground text-center">No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Organization</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 last:border-0">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#032364] text-xs font-semibold text-white shrink-0">
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#051536] truncate">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[150px]">{user.organization?.name ?? 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updatingId === user.id}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="hr_admin">HR Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        {user.is_active ? (
                          <Badge className="bg-green-100 text-green-700">
                            <UserCheck className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <UserX className="mr-1 h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          disabled={updatingId === user.id}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="mr-1 h-3.5 w-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-1 h-3.5 w-3.5" />
                              Activate
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
