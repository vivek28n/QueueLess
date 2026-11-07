import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">
          Verifying Session Credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-rose-500/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="h-12 w-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Access Restricted</h2>
            <p className="text-xs text-slate-400">
              Your account has the role <span className="font-semibold text-slate-200">[{user?.role}]</span>. This section requires <span className="font-semibold text-indigo-400">[{requiredRole}]</span> privileges.
            </p>
          </div>
          <Link to="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Safety</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
