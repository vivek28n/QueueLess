import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin'); // 'admin' | 'staff'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destination = location.state?.from?.pathname || '/admin';

  // If already authenticated, redirect to admin
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, destination]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({ email, password, role });
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-144px)] flex items-center justify-center px-4 py-16 relative">
      <div className="gradient-glow-indigo top-10 left-1/2 -translate-x-1/2 w-[500px] h-[350px]" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-2">
            <Layers className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign In to QueueLess
          </h1>
          <p className="text-sm text-slate-400">
            Access your live queue management control center
          </p>
        </div>

        {/* Card */}
        <Card className="border-slate-800/90 shadow-2xl p-8 space-y-6">
          {/* Role Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                role === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Administrator
            </button>
            <button
              type="button"
              onClick={() => setRole('staff')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                role === 'staff'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Counter Staff
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Authentication Failed</p>
                <p className="text-rose-300/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              icon={Mail}
              placeholder="admin@yourbusiness.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Remember me</span>
              </label>
              <span className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <span>Sign In as {role === 'admin' ? 'Administrator' : 'Staff'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Don't have a business account?{' '}
              <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300">
                Register here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
