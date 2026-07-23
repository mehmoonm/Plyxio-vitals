import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export function RoleGuard({
  allowed,
  children,
  fallbackHref = '/dashboard',
}: {
  allowed: boolean;
  children: React.ReactNode;
  fallbackHref?: string;
}) {
  if (!allowed) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center space-y-3 max-w-md mx-auto mt-12">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-semibold text-white">Not authorized</h2>
        <p className="text-gray-400 text-sm">You don't have permission to access this page.</p>
        <Link href={fallbackHref} className="inline-block text-indigo-300 text-sm hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
