import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Server,
  Layers,
  Sliders,
  LogOut,
  Building2,
  Shield,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [backendHealth, setBackendHealth] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Check the backend health-check endpoint on mount
  const checkServerHealth = async () => {
    setCheckingHealth(true);
    try {
      const response = await api.get('/health');
      setBackendHealth({ status: 'connected', data: response.data });
    } catch (err) {
      setBackendHealth({ status: 'error', message: err.message });
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkServerHealth();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-[calc(100vh-144px)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {user?.business?.name || 'Queue Operations Console'}
            </h1>
            <Badge variant="indigo" dot={true}>
              {user?.role === 'admin' ? 'Organization Admin' : 'Staff Desk'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1.5 font-mono text-indigo-300">
              <Building2 className="h-3.5 w-3.5 text-indigo-400" />
              ID: {user?.business?.businessId || 'N/A'}
            </span>
            <span>•</span>
            <span className="capitalize text-slate-300">
              Category: {user?.business?.industry || 'General'}
            </span>
            <span>•</span>
            <span className="text-slate-400">
              Logged in as: <strong className="text-white">{user?.name}</strong> ({user?.email})
            </span>
          </div>
        </div>

        {/* Server Health Status Pill & Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={checkServerHealth}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors"
            title="Refresh backend status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkingHealth ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>API: {backendHealth?.status === 'connected' ? 'Connected (200 OK)' : 'Offline'}</span>
          </button>

          <Button size="sm" variant="outline" onClick={handleLogout} className="text-slate-300 hover:text-rose-400">
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* Backend Diagnostics Banner */}
      {backendHealth?.data && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-white">Live Engine Telemetry:</span>
            <span className="text-slate-400">Uptime: {backendHealth.data.uptime}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Node: {backendHealth.data.system?.nodeVersion}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Database: {backendHealth.data.database?.status}</span>
          </div>
          <Badge variant="success" dot={true}>
            MongoDB + Express Active
          </Badge>
        </div>
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Waiting Queue</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">0</span>
            <span className="text-xs text-slate-500">tickets in line</span>
          </div>
          <p className="text-[11px] text-slate-400">Awaiting queue activation in Phase 3</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Served Today</span>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">0</span>
            <span className="text-xs text-slate-500">completed</span>
          </div>
          <p className="text-[11px] text-slate-400">Counter sessions completed</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Wait Time</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">--</span>
            <span className="text-xs text-slate-500">mins</span>
          </div>
          <p className="text-[11px] text-slate-400">Dynamic algorithmic calculation</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Desks</span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">0</span>
            <span className="text-xs text-slate-500">open counters</span>
          </div>
          <p className="text-[11px] text-slate-400">Multi-counter dispatch ready</p>
        </Card>
      </div>

      {/* Main Console Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Queue Controller Shell */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Live Queue Monitor</h3>
                <p className="text-xs text-slate-400">Real-time patron stream synchronized via Socket.IO</p>
              </div>
              <Badge variant="default">Idle Mode</Badge>
            </div>

            {/* Production Empty State */}
            <div className="text-center py-16 px-4 space-y-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-white">
                  Welcome to {user?.business?.name}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your business account is verified and ready. In Phase 3, live ticket generation, queue rooms, and customer dispatching will be enabled.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 text-xs font-mono">
                  Organization Slug: {user?.business?.businessId}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Counter & Desk Management Shell */}
        <div className="space-y-6">
          <Card className="border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Counter Control</h3>
              <Sliders className="h-4 w-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <p className="text-xs font-semibold text-slate-300">Desk 01 — Primary Service</p>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Status: Ready</span>
                  <Badge variant="default" size="sm">Standby</Badge>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <p className="text-xs font-semibold text-slate-300">Desk 02 — Priority Desk</p>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Status: Ready</span>
                  <Badge variant="default" size="sm">Standby</Badge>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[11px] text-slate-500 text-center">
                Counter calling and audio chime notifications activate when queue sessions are live.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
