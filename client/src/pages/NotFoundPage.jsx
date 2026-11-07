import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[calc(100vh-144px)] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center">
          <Layers className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <p className="text-4xl font-black text-white font-mono">404</p>
          <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
          <p className="text-sm text-slate-400">
            The queue or screen you are looking for does not exist or has been moved.
          </p>
        </div>
        <div>
          <Link to="/">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
