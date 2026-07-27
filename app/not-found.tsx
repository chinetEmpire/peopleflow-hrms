import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f2e9e9] px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#032364]/10 mb-6">
        <span className="text-4xl font-bold text-[#032364]">404</span>
      </div>
      <h1 className="text-2xl font-bold text-[#051536]">Page Not Found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="mt-6">
        <Button className="bg-[#032364] hover:bg-[#051536]">Go Home</Button>
      </Link>
    </div>
  );
}
