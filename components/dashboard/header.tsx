'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings, Menu } from 'lucide-react';
import { NotificationBell } from './notification-bell';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="backdrop-blur-xl bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-b border-white/10 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg gradient-primary-br flex items-center justify-center shadow-lg flex-shrink-0">
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-lg font-semibold text-white truncate">{user?.fullName}</h2>
          <p className="text-xs text-gray-400 capitalize font-medium truncate">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <div className="hidden lg:flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-gray-300">{user?.email}</span>
        </div>
        <NotificationBell />
        <Link href="/dashboard/settings">
          <button className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 transition-all duration-300">
            <Settings className="w-5 h-5" />
          </button>
        </Link>
        <Button
          onClick={handleLogout}
          className="flex items-center space-x-2 gradient-primary text-white hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 rounded-lg px-3 sm:px-4 py-2 font-semibold"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
