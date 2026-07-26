'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Mail, Plus, Trash2, Copy, Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by_name: string;
  token?: string;
}

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMembersDialog({ open, onOpenChange }: InviteMembersDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [invitedToken, setInvitedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      fetchInvitations();
    }
  }, [open]);

  async function fetchInvitations() {
    setFetching(true);
    try {
      const session = await getSupabase().auth.getSession();
      const res = await fetch('/api/invitations', {
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
      });
      const data = await res.json();
      if (data.invitations) {
        setInvitations(data.invitations);
      }
    } catch {
      console.error('Failed to fetch invitations');
    }
    setFetching(false);
  }

  async function handleInvite() {
    if (!email.trim()) return;

    setLoading(true);
    try {
      const session = await getSupabase().auth.getSession();
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({ action: 'invite', email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to send invitation');
        setLoading(false);
        return;
      }

      toast.success(`Invitation sent to ${email}`);
      setInvitedToken(data.invitation.token);
      setEmail('');
      fetchInvitations();
    } catch {
      toast.error('Failed to send invitation');
    }
    setLoading(false);
  }

  async function handleRevoke(id: string) {
    try {
      const session = await getSupabase().auth.getSession();
      await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({ action: 'revoke', id }),
      });
      toast.success('Invitation revoked');
      fetchInvitations();
    } catch {
      toast.error('Failed to revoke invitation');
    }
  }

  function copyInviteLink(token: string) {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite link copied to clipboard');
  }

  const inviteLink = invitedToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/accept-invite?token=${invitedToken}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#032364]">
            <UserPlus className="h-5 w-5" />
            Invite Team Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleInvite();
                }
              }}
              placeholder="colleague@company.com"
              className="h-10 flex-1 rounded-lg border-[#0000004c]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-10 rounded-lg border border-[#0000004c] px-3 text-sm"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              {profile?.role === 'super_admin' && (
                <option value="hr_admin">HR Admin</option>
              )}
            </select>
            <Button
              onClick={handleInvite}
              disabled={loading || !email.trim()}
              className="h-10 rounded-lg bg-[#032364] text-white hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Show invite link after sending */}
          {invitedToken && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-medium text-green-800 mb-2">
                Share this invite link:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                  {inviteLink}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyInviteLink(invitedToken)}
                  className="h-8 px-2"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Pending Invitations */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Pending Invitations ({invitations.length})
            </Label>

            {fetching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <Mail className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-1 text-xs text-muted-foreground">
                  No pending invitations
                </p>
              </div>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {inv.role.replace('_', ' ')} · Invited by {inv.invited_by_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {inv.token && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(inv.token!)}
                          className="h-7 px-2"
                          title="Copy invite link"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(inv.id)}
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        title="Revoke invitation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
