import React from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Footer = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070a12] text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                <Layers className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Queue<span className="text-indigo-400">Less</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Real-time, intelligent virtual queue orchestration platform. Eliminating physical waiting lines for healthcare, retail, dining, and public services.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="success" dot={true}>
                Engine Status: Live & Operational
              </Badge>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Application
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/queue" className="hover:text-white transition-colors">
                  Join Customer Queue
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  Administrator Portal
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Account Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Business Registration
                </Link>
              </li>
            </ul>
          </div>

          {/* Technology & Real-time */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Architecture
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Socket.IO Bi-directional Sync
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Node.js + Express REST API
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                MongoDB + Mongoose Cluster
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                JWT Role-Based Access
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} QueueLess Systems Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">API Docs</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
