import { NextResponse } from 'next/server';
import { isPaystackConfigured } from '@/lib/paystack';

export async function GET() {
  return NextResponse.json({ configured: isPaystackConfigured() });
}