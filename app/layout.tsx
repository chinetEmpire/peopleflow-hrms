import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { TenantProvider } from '@/lib/tenant-context';
import { Toaster } from '@/components/ui/sonner';
import { DynamicBrandStyles } from '@/components/dynamic-brand-styles';

export const metadata: Metadata = {
  title: 'HR Platform — Modern HR Management for Growing Teams',
  description: 'Streamline employee management, attendance tracking, payroll processing, and leave management in one powerful, secure platform.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background text-foreground">
        <AuthProvider>
          <TenantProvider>
            <DynamicBrandStyles />
            {children}
            <Toaster />
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
