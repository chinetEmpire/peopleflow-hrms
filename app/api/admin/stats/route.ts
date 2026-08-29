import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  try {
    const user = await verifySuperAdmin(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const [
      { count: totalOrgs },
      { count: totalUsers },
      { count: activeUsers },
      { count: totalDepts },
      { data: orgs },
      { data: recentProfiles },
      { data: paymentRows },
    ] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('departments').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*'),
      supabase.from('profiles').select('id, first_name, last_name, email, created_at, org_id').order('created_at', { ascending: false }).limit(5),
      supabase.from('payments').select('amount, refunded_amount, status, reconciliation_status').limit(5000),
    ]);

    const planMap = new Map<string, number>();
    (orgs ?? []).forEach((org: any) => {
      planMap.set(org.plan, (planMap.get(org.plan) ?? 0) + 1);
    });

    const planBreakdown = Array.from(planMap.entries()).map(([plan, count]) => ({ plan, count }));

    let grossCollected = 0;
    let refundedAmount = 0;
    let pendingAmount = 0;
    let matchedPayments = 0;
    let unmatchedPayments = 0;
    for (const row of paymentRows ?? []) {
      const amount = Number(row.amount ?? 0);
      const refunded = Number(row.refunded_amount ?? 0);
      if (row.status === 'success' || row.status === 'partial_refund' || row.status === 'refunded') {
        grossCollected += amount;
      } else {
        pendingAmount += amount;
      }
      refundedAmount += refunded;
      if (row.reconciliation_status === 'matched') matchedPayments += 1;
      if (row.reconciliation_status === 'unmatched') unmatchedPayments += 1;
    }

    return NextResponse.json({
      totalOrganizations: totalOrgs ?? 0,
      totalUsers: totalUsers ?? 0,
      activeUsers: activeUsers ?? 0,
      inactiveUsers: (totalUsers ?? 0) - (activeUsers ?? 0),
      totalDepartments: totalDepts ?? 0,
      planBreakdown,
      recentSignups: recentProfiles ?? [],
      payments: {
        grossCollected,
        netCollected: grossCollected - refundedAmount,
        refundedAmount,
        pendingAmount,
        matchedPayments,
        unmatchedPayments,
      },
    });
  } catch (err) {
    console.error('Failed to fetch admin stats:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
