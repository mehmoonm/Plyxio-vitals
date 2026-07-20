'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@hospital.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-600/20 rounded-full mix-blend-screen blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-cyan-600/20 rounded-full mix-blend-screen blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="glass-card p-8 rounded-2xl space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg gradient-primary mb-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11l-7 7-7-7m0 0l7-7 7 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              MediCare
            </h1>
            <p className="text-gray-300 text-sm">Hospital Management System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-gray-200 block">Email Address</label>
              <Input
                id="email"
                type="email"
                placeholder="admin@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="glass-input w-full px-4 py-3 rounded-lg text-white"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-200 block">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="glass-input w-full px-4 py-3 rounded-lg text-white"
              />
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg text-sm backdrop-blur-xl">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full gradient-primary text-white font-semibold py-3 rounded-lg hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-widest">Demo Credentials</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="text-left">
                  <p className="text-gray-200 font-medium group-hover:text-indigo-400 transition-colors">Admin</p>
                  <p className="text-gray-400 text-xs">admin@hospital.com</p>
                </div>
                <span className="text-gray-500 group-hover:text-gray-300">→</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="text-left">
                  <p className="text-gray-200 font-medium group-hover:text-cyan-400 transition-colors">Doctor</p>
                  <p className="text-gray-400 text-xs">dr.smith@hospital.com</p>
                </div>
                <span className="text-gray-500 group-hover:text-gray-300">→</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="text-left">
                  <p className="text-gray-200 font-medium group-hover:text-purple-400 transition-colors">Patient</p>
                  <p className="text-gray-400 text-xs">john@example.com</p>
                </div>
                <span className="text-gray-500 group-hover:text-gray-300">→</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="text-left">
                  <p className="text-gray-200 font-medium group-hover:text-pink-400 transition-colors">Staff</p>
                  <p className="text-gray-400 text-xs">nurse1@hospital.com</p>
                </div>
                <span className="text-gray-500 group-hover:text-gray-300">→</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">Password: role123 (e.g., admin123, doctor123)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
