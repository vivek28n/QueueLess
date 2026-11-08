import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    businessName: '',
    adminName: '',
    email: '',
    password: '',
    industry: 'healthcare',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    const passwordBytes = new TextEncoder().encode(formData.password).length;
    if (passwordBytes > 72) {
      setErrorMessage('Password cannot exceed 72 bytes. Note that multibyte characters (such as emojis or accented characters) occupy more than 1 byte each.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        businessName: formData.businessName,
        adminName: formData.adminName,
        email: formData.email,
        password: formData.password,
        industry: formData.industry,
      });

      navigate('/admin', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-144px)] flex items-center justify-center px-4 py-16 relative">
      <div className="gradient-glow-cyan top-10 left-1/2 -translate-x-1/2 w-[550px] h-[350px]" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="indigo" size="md">
            Enterprise Ready
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create Your Queue System
          </h1>
          <p className="text-sm text-slate-400">
            Set up real-time live customer queueing for your venue in seconds
          </p>
        </div>

        {/* Card */}
        <Card className="border-slate-800/90 shadow-2xl p-8 space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Registration Failed</p>
                <p className="text-rose-300/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Business / Organization Name"
              name="businessName"
              icon={Building2}
              placeholder="e.g. Apex Health Clinic or Metro Bistro"
              value={formData.businessName}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Administrator Full Name"
                name="adminName"
                icon={User}
                placeholder="Dr. John Doe"
                value={formData.adminName}
                onChange={handleChange}
                disabled={isLoading}
                required
              />

              <div className="w-full space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider uppercase text-slate-400">
                  Industry / Category
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="healthcare">Healthcare & Medical</option>
                  <option value="restaurant">Dining & Hospitality</option>
                  <option value="retail">Retail & Customer Desk</option>
                  <option value="banking">Financial & Banking</option>
                  <option value="government">Public & Government</option>
                  <option value="other">Other Service</option>
                </select>
              </div>
            </div>

            <Input
              label="Work Email"
              type="email"
              name="email"
              icon={Mail}
              placeholder="admin@business.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <Input
              label="Create Password"
              type="password"
              name="password"
              icon={Lock}
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <div className="text-xs text-slate-400 space-y-2 pt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>
                  I agree to the Terms of Service and acknowledge the real-time queue data policy.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <span>Initialize Workspace & Launch</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
