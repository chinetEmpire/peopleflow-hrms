'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Search,
  Users,
  FolderOpen,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  plan: string;
  max_employees: number;
  created_at: string;
  user_count: number;
  department_count: number;
  subscription: { plan_id: string; status: string } | null;
}

export default function AdminOrganizationsPage() {
  const { profile } = useAuth();
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch('/api/admin/organizations', {
          headers: { Authorization: `Bearer ${localStorage.getItem('supabase.auth.token') ?? ''}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOrgs(data.organizations ?? []);
        }
      } catch (e) {
        console.error('Failed to load organizations', e);
      } finally {
        setLoading(false);
      }
    }

    const token = localStorage.getItem('supabase.auth.token');
    if (!token) {
      setLoading(false);
      return;
    }
    loadOrgs();
  }, []);

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied. Super admin only.</p>
      </div>
    );
  }

  const filtered = orgs.filter((org) => {
    const q = search.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      org.slug.toLowerCase().includes(q) ||
      org.plan.toLowerCase().includes(q)
    );
  });

  const planBadge: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Organizations</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all tenant organizations on the platform</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg pl-10"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} organization{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Organizations List */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#032364]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground text-center">No organizations found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((org) => (
            <Card key={org.id} className="rounded-xl border-0 bg-white vcgl-shadow hover:shadow-lg transition">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
                      style={{ backgroundColor: (org.primary_color || '#032364') + '15' }}
                    >
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded object-contain" />
                      ) : (
                        <Building2 className="h-6 w-6" style={{ color: org.primary_color || '#032364' }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[#051536]">{org.name}</h3>
                        <Badge className={planBadge[org.plan] ?? 'bg-gray-100 text-gray-700'}>
                          {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        slug: {org.slug} • Created {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{org.user_count} user{org.user_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FolderOpen className="h-4 w-4" />
                      <span>{org.department_count} dept{org.department_count !== 1 ? 's' : ''}</span>
                    </div>
                    <Link href={`/admin/organizations/${org.id}`}>
                      <Button variant="outline" size="sm" className="rounded-lg">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
