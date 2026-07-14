'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user && profile) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, profile, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#f2e9e9]">
      <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
    </div>
  );
}
