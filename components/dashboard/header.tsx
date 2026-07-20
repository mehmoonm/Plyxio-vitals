'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="backdrop-blur-xl bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-white/10 px-8 py-5 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
          <p className="text-xs text-gray-400 capitalize font-medium">{user?.role.toUpperCase()}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-gray-300">{user?.email}</span>
        </div>
        <Button
          onClick={handleLogout}
          className="flex items-center space-x-2 gradient-primary text-white hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 rounded-lg px-4 py-2 font-semibold"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
