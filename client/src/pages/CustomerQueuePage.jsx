import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Smartphone,
  Search,
  Wifi,
  Clock,
  Users,
  AlertCircle,
  QrCode,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const CustomerQueuePage = () => {
  const [searchParams] = useSearchParams();
  const [queueCode, setQueueCode] = useState(searchParams.get('code') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [ticketState, setTicketState] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setQueueCode(code);
    }
  }, [searchParams]);

  const handleLookup = (e) => {
    e.preventDefault();
    if (!queueCode.trim()) return;

    setIsSearching(true);
    setStatusMessage(null);

    // Initial phase: no fake hardcoded tickets; inform user that queue lookup endpoint will be connected
    setTimeout(() => {
      setIsSearching(false);
      setStatusMessage({
        type: 'info',
        message: `Queue lookup for "${queueCode.toUpperCase()}" initialized. Live Socket.IO sync and customer registration will be connected in Phase 2.`,
      });
    }, 500);
  };

  return (
    <div className="min-h-[calc(100vh-144px)] py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="text-center space-y-3">
        <Badge variant="cyan" dot={true}>
          Live Guest Portal
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Live Queue Tracker
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Enter your queue code to monitor your place in line, receive real-time counter summons, and estimated wait duration.
        </p>
      </div>

      {/* Queue Code Lookup Card */}
      <Card className="max-w-xl mx-auto border-slate-800 shadow-2xl p-6 sm:p-8">
        <form onSubmit={handleLookup} className="space-y-4">
          <Input
            label="Enter Queue Code or Ticket Reference"
            placeholder="e.g. CLINIC-101 or QL-8492"
            value={queueCode}
            onChange={(e) => setQueueCode(e.target.value)}
            icon={Search}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSearching}
          >
            <span>Connect to Live Queue</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {statusMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-indigo-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">System Ready</p>
              <p className="text-slate-400 mt-0.5">{statusMessage.message}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Explanatory Architecture / How It Works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 max-w-3xl mx-auto">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center space-y-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Wifi className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Real-Time Push
          </h4>
          <p className="text-xs text-slate-400">
            Instant updates via Socket.IO whenever someone is called or leaves.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center space-y-2">
          <div className="h-8 w-8 rounded-lg bg-cyan-600/20 text-cyan-400 mx-auto flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Live ETA
          </h4>
          <p className="text-xs text-slate-400">
            Dynamically updated wait times based on counter processing rates.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center space-y-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 mx-auto flex items-center justify-center">
            <Smartphone className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Zero Install
          </h4>
          <p className="text-xs text-slate-400">
            Works cleanly in standard mobile Safari, Chrome, and desktop browsers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerQueuePage;
