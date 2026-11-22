import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail, Eye, EyeOff, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export function AdminLoginPage() {
  const { login, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const profile = await login(email.trim(), password);
      toast({
        title: `Welcome back, ${profile.fullName}`,
        description: `Signed in with ${profile.role} privileges.`,
        variant: 'success',
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
              <GraduationCap className="h-6 w-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Admin &amp; Faculty Sign In
          </h1>
          <p className="text-sm text-slate-500">
            College Quiz &amp; Anonymous Feedback Portal
          </p>
        </div>

        <Card className="shadow-lg border-slate-200/90">
          <CardHeader>
            <CardTitle className="text-lg">Secure Portal Authentication</CardTitle>
            <CardDescription>
              Sign in with your institutional credentials. Role-based access controls protect anonymous feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@college.edu"
                    className="pl-9"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>
            </form>

            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200/70 p-3.5 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                <span>Role-Based Privacy Enforcement</span>
              </div>
              <p>
                <strong>Administrators</strong> manage quizzes, aggregate analytics, anonymous feedback, and settings.{' '}
                <strong>Staff</strong> can manage quizzes and aggregate analytics, and are strictly blocked from anonymous feedback.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
