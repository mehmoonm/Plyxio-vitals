import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 p-6 hover:border-white/40 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`}></div>
      </div>
      
      <div className="relative flex items-center justify-between">
        <div className="space-y-3">
          <p className="text-gray-300 text-sm font-semibold uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            {value}
          </p>
        </div>
        <div className={`bg-gradient-to-br ${color} p-4 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
}
