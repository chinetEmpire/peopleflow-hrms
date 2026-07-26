'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase, AuditLog } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Search,
  FilePlus,
  FileEdit,
  FileMinus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function AdminAuditPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false })
        .limit(500);
      setLogs(data ?? []);
      setLoading(false);
    }
    loadLogs();
  }, []);

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      (log.profiles?.first_name ?? '').toLowerCase().includes(q) ||
      (log.profiles?.last_name ?? '').toLowerCase().includes(q) ||
      (log.profiles?.email ?? '').toLowerCase().includes(q)
    );
  });

  function actionIcon(action: string) {
    if (action === 'create') return <FilePlus className="h-4 w-4 text-green-600" />;
    if (action === 'update') return <FileEdit className="h-4 w-4 text-amber-600" />;
    if (action === 'delete') return <FileMinus className="h-4 w-4 text-red-600" />;
    if (action === 'approve') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (action === 'reject') return <XCircle className="h-4 w-4 text-red-600" />;
    return <FileEdit className="h-4 w-4 text-muted-foreground" />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#051536]">Platform Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor all actions across all organizations</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-xl font-bold text-[#051536] mt-1">{logs.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#032364]/10">
                <ShieldCheck className="h-6 w-6 text-[#032364]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Creates</p>
            <p className="text-xl font-bold text-green-600 mt-1">{logs.filter((l) => l.action === 'create').length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Updates</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{logs.filter((l) => l.action === 'update').length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Deletes</p>
            <p className="text-xl font-bold text-red-600 mt-1">{logs.filter((l) => l.action === 'delete').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search audit logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg pl-10"
        />
      </div>

      {/* Audit Log Table */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#051536]">All Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No audit logs found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((log) => (
                <div key={log.id} className="flex flex-col gap-2 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                    {actionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{log.action}</span>
                      <Badge variant="outline" className="text-xs">{log.entity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name} (${log.profiles.email})` : 'System'}
                      {log.entity_id && ` • ID: ${log.entity_id.slice(0, 8)}...`}
                    </p>
                    {Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap sm:ml-auto">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
