'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuth } from '@/lib/patient-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DEMO_HOSPITAL_ID = '57497c75-d23c-4b87-acae-0927b2702e25';

export default function PortalLoginPage() {
  const router = useRouter();
  const { login, register, requestPasswordReset } = usePatientAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [loginForm, setLoginForm] = useState({ email: 'patient@plyxio-demo.pk', password: 'Plyxio@2026' });
  const [regForm, setRegForm] = useState({ fullName: '', email: '', phone: '', cnic: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      router.push('/portal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await register({
        email: regForm.email,
        password: regForm.password,
        fullName: regForm.fullName,
        phone: regForm.phone || undefined,
        cnic: regForm.cnic || undefined,
        hospitalId: DEMO_HOSPITAL_ID,
      });
      if (result.needsEmailConfirmation) {
        setSuccess('Account created — check your email to confirm it, then sign in.');
        setMode('login');
      } else {
        router.push('/portal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await requestPasswordReset(forgotEmail);
      setSuccess('If that email has an account, a reset link is on its way.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-dark min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 rounded-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              MediCare Patient Portal
            </h1>
            <p className="text-gray-300 text-sm">View records, book visits, pay bills, message your doctor</p>
          </div>

          <div className="flex bg-white/5 rounded-lg p-1">
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${mode === 'login' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>
              Sign In
            </button>
            <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${mode === 'register' ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}>
              Create Account
            </button>
          </div>

          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}
          {success && <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 p-3 rounded-lg text-sm">{success}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white" required />
              <Input type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white" required />
              <Button type="submit" disabled={loading} className="w-full gradient-primary text-white font-semibold py-3 rounded-lg">
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setForgotEmail(loginForm.email); }} className="text-xs text-gray-400 hover:text-indigo-300 transition-colors block mx-auto">
                Forgot your password?
              </button>
            </form>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-gray-300">Enter your account email and we'll send a link to reset your password.</p>
              <Input type="email" placeholder="Email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="glass-input w-full px-4 py-3 rounded-lg text-white" required />
              <Button type="submit" disabled={loading} className="w-full gradient-primary text-white font-semibold py-3 rounded-lg">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-xs text-gray-400 hover:text-indigo-300 transition-colors block mx-auto">
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <Input placeholder="Full name" value={regForm.fullName} onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white" required />
              <Input type="email" placeholder="Email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white" required />
              <p className="text-xs text-gray-400 -mt-2">If the hospital already has your email on file, this will link to your existing records.</p>
              <Input placeholder="Phone" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white" />
              <Input placeholder="CNIC (optional)" value={regForm.cnic} onChange={(e) => setRegForm({ ...regForm, cnic: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white" />
              <Input type="password" placeholder="Password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} className="glass-input w-full px-4 py-3 rounded-lg text-white" required minLength={6} />
              <Button type="submit" disabled={loading} className="w-full gradient-primary text-white font-semibold py-3 rounded-lg">
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-white/10">
            <p className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-widest">Demo Patient Account</p>
            <button
              type="button"
              onClick={() => { setMode('login'); setLoginForm({ email: 'patient@plyxio-demo.pk', password: 'Plyxio@2026' }); setError(''); setSuccess(''); }}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group text-left"
            >
              <div>
                <p className="text-gray-200 font-medium group-hover:text-indigo-400 transition-colors">Hamza Sheikh</p>
                <p className="text-gray-400 text-xs">patient@plyxio-demo.pk</p>
              </div>
              <span className="text-gray-500 group-hover:text-gray-300">→</span>
            </button>
          </div>

          <div className="text-center">
            <a href="/login" className="text-xs text-gray-400 hover:text-indigo-300 transition-colors">
              Hospital staff? Sign in here →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
