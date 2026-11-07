import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Building2,
  CheckCircle,
  User,
  Phone,
  ArrowLeft,
  Volume2,
  Share2,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import api from '../services/api';
import socket, { joinQueueRoom, connectSocket } from '../services/socket';

export const CustomerQueuePage = () => {
  const { queueId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Queue Code
  const initialCode = (queueId || searchParams.get('code') || '').trim().toUpperCase();
  const [queueCode, setQueueCode] = useState(initialCode);
  const [searchInput, setSearchInput] = useState(initialCode);

  // Data states
  const [queueInfo, setQueueInfo] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState(null);

  // Active Ticket tracking
  const [ticketData, setTicketData] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [ticketError, setTicketError] = useState(null);

  // Join form state
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [joinError, setJoinError] = useState(null);

  // Real-time Socket status
  const [socketStatus, setSocketStatus] = useState('connecting'); // 'connected' | 'reconnecting' | 'offline'

  // Refresh status state & UI helpers
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state if URL changes
  useEffect(() => {
    const code = (queueId || searchParams.get('code') || '').trim().toUpperCase();
    if (code && code !== queueCode) {
      setQueueCode(code);
      setSearchInput(code);
    }
  }, [queueId, searchParams, queueCode]);

  // Fetch Public Queue Details
  const fetchQueue = useCallback(async (codeToFetch) => {
    if (!codeToFetch) return;
    try {
      setLoadingQueue(true);
      setQueueError(null);
      const res = await api.get(`/public/queues/${codeToFetch}`);
      setQueueInfo(res.data?.data || null);
    } catch (err) {
      setQueueError(err.message || `Queue "${codeToFetch}" not found.`);
      setQueueInfo(null);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  // Fetch Ticket Status (authoritative database state)
  const fetchTicket = useCallback(async (ticketId) => {
    if (!ticketId) return;
    try {
      setLoadingTicket(true);
      setTicketError(null);
      const res = await api.get(`/public/tickets/${ticketId}`);
      setTicketData(res.data?.data || null);
    } catch (err) {
      setTicketError(err.message || 'Failed to load ticket information.');
      // If ticket no longer exists, clear storage
      if (err.message?.includes('not found')) {
        localStorage.removeItem(`queueless_ticket_${queueCode}`);
        setTicketData(null);
      }
    } finally {
      setLoadingTicket(false);
    }
  }, [queueCode]);

  // On queue code change, check for saved ticket in localStorage & fetch queue info
  useEffect(() => {
    if (queueCode) {
      fetchQueue(queueCode);
      const savedTicketId = localStorage.getItem(`queueless_ticket_${queueCode}`);
      if (savedTicketId) {
        fetchTicket(savedTicketId);
      } else {
        setTicketData(null);
      }
    } else {
      setQueueInfo(null);
      setTicketData(null);
    }
  }, [queueCode, fetchQueue, fetchTicket]);

  // Real-time Socket.IO Connection & Event Listeners
  useEffect(() => {
    if (!queueCode) return;

    connectSocket();
    const activeTicketId = ticketData?.ticket?.id || localStorage.getItem(`queueless_ticket_${queueCode}`);
    joinQueueRoom(queueCode, activeTicketId);

    const onConnect = () => {
      setSocketStatus('connected');
      // On reconnect, always fetch latest authoritative DB state
      fetchQueue(queueCode);
      if (activeTicketId) {
        fetchTicket(activeTicketId);
      }
    };

    const onDisconnect = () => {
      setSocketStatus('offline');
    };

    const onConnectError = () => {
      setSocketStatus('reconnecting');
    };

    const onQueueState = (stateData) => {
      if (stateData?.queue) {
        setQueueInfo({
          queue: stateData.queue,
          stats: stateData.stats,
        });
      }
      if (stateData?.ticket) {
        setTicketData((prev) => ({
          ...prev,
          ticket: { ...(prev?.ticket || {}), ...stateData.ticket },
          position: stateData.ticket.position,
          peopleAhead: stateData.ticket.peopleAhead,
          estimatedWaitTimeMinutes: stateData.ticket.estimatedWaitTimeMinutes,
          queue: stateData.queue,
        }));
      }
    };

    const onQueueUpdated = (data) => {
      if (data.queueCode === queueCode) {
        setQueueInfo((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            queue: data.queue ? { ...prev.queue, ...data.queue } : prev.queue,
            stats: data.stats ? { ...prev.stats, ...data.stats } : prev.stats,
          };
        });

        // If we hold an active ticket, refresh position
        const currentTicketId = ticketData?.ticket?.id || localStorage.getItem(`queueless_ticket_${queueCode}`);
        if (currentTicketId) {
          fetchTicket(currentTicketId);
        }
      }
    };

    const onTicketUpdated = (data) => {
      const currentTicketId = ticketData?.ticket?.id || localStorage.getItem(`queueless_ticket_${queueCode}`);
      if (data.ticket && currentTicketId && (data.ticket.id === currentTicketId || data.ticket._id === currentTicketId)) {
        setTicketData((prev) => ({
          ...prev,
          ticket: { ...(prev?.ticket || {}), ...data.ticket },
          position: data.ticket.position ?? prev?.position,
          peopleAhead: data.ticket.peopleAhead ?? prev?.peopleAhead,
          estimatedWaitTimeMinutes: data.ticket.estimatedWaitTimeMinutes ?? prev?.estimatedWaitTimeMinutes,
          queue: { ...(prev?.queue || {}), currentlyServing: data.stats?.currentlyServing ?? prev?.queue?.currentlyServing },
        }));
      } else if (data.queueCode === queueCode && currentTicketId) {
        // Someone else was called/completed, refresh our line position
        fetchTicket(currentTicketId);
      }
    };

    const onQueueError = (errData) => {
      console.warn('[Socket Queue Error]', errData?.message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('queue:state', onQueueState);
    socket.on('queue:updated', onQueueUpdated);
    socket.on('ticket:updated', onTicketUpdated);
    socket.on('queue:error', onQueueError);

    if (socket.connected) {
      setSocketStatus('connected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('queue:state', onQueueState);
      socket.off('queue:updated', onQueueUpdated);
      socket.off('ticket:updated', onTicketUpdated);
      socket.off('queue:error', onQueueError);
    };
  }, [queueCode, ticketData?.ticket?.id, fetchQueue, fetchTicket]);

  // Periodic Polling Fallback when socket is offline or reconnecting
  useEffect(() => {
    const currentTicketId = ticketData?.ticket?.id;
    if (!currentTicketId) return;

    const terminalStatuses = ['completed', 'skipped', 'cancelled'];
    if (terminalStatuses.includes(ticketData.ticket.status)) return;

    // Fast polling if socket offline; gentle background sync if socket connected
    const pollIntervalMs = socketStatus === 'connected' ? 25000 : 8000;
    const interval = setInterval(() => {
      fetchTicket(currentTicketId);
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [ticketData?.ticket?.id, ticketData?.ticket?.status, socketStatus, fetchTicket]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (!clean) return;
    setQueueCode(clean);
    setSearchParams({ code: clean });
  };

  // Handle Join Queue
  const handleJoinQueue = async (e) => {
    e.preventDefault();
    setJoinError(null);

    if (!customerName.trim()) {
      setJoinError('Please enter your name.');
      return;
    }

    try {
      setJoiningQueue(true);
      const res = await api.post(`/public/queues/${queueCode}/join`, {
        customerName: customerName.trim(),
        customerContact: customerContact.trim(),
      });

      const responseData = res.data?.data;
      const newTicketId = responseData?.ticket?.id;

      if (newTicketId) {
        localStorage.setItem(`queueless_ticket_${queueCode}`, newTicketId);
        setTicketData(responseData);
        // Subscribe to socket room for this specific ticket
        joinQueueRoom(queueCode, newTicketId);
      }

      setCustomerName('');
      setCustomerContact('');
    } catch (err) {
      setJoinError(err.message || 'Failed to join queue.');
    } finally {
      setJoiningQueue(false);
    }
  };

  // Handle Manual Refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (ticketData?.ticket?.id) {
      await fetchTicket(ticketData.ticket.id);
    }
    if (queueCode) {
      await fetchQueue(queueCode);
    }
    setIsRefreshing(false);
  };

  // Handle Leave Queue / Discard Ticket
  const handleLeaveQueue = () => {
    if (window.confirm('Do you want to release this ticket and leave the queue tracker?')) {
      localStorage.removeItem(`queueless_ticket_${queueCode}`);
      setTicketData(null);
      fetchQueue(queueCode);
    }
  };

  // Handle Share / Copy Link
  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const queue = queueInfo?.queue;
  const isCalled = ticketData?.ticket?.status === 'called';
  const isServing = ticketData?.ticket?.status === 'serving';
  const isCompleted = ticketData?.ticket?.status === 'completed';
  const isSkipped = ticketData?.ticket?.status === 'skipped';

  return (
    <div className="min-h-[calc(100vh-144px)] py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
      {/* Top Header / Navigation & Socket Status */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <Link to="/" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Home</span>
        </Link>

        <div className="flex items-center gap-3">
          {queueCode && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
              title={`Real-time WebSocket: ${socketStatus}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  socketStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : socketStatus === 'reconnecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
              <span className="capitalize">{socketStatus === 'connected' ? 'Live' : socketStatus}</span>
            </div>
          )}

          {queueCode && (
            <button
              type="button"
              onClick={() => {
                setQueueCode('');
                setSearchInput('');
                setSearchParams({});
                setTicketData(null);
                setQueueInfo(null);
              }}
              className="hover:text-indigo-400 transition-colors"
            >
              Change Queue
            </button>
          )}
        </div>
      </div>

      {/* Screen 1: Search for Queue if none selected or not found */}
      {!queueCode || queueError ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="cyan" dot={true}>
              Contactless Guest Queue
            </Badge>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Join a Live Virtual Line
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Enter your venue's queue code to check waiting times, receive digital tokens, and get live counter call alerts.
            </p>
          </div>

          <Card className="p-6 sm:p-8 border-slate-800 shadow-2xl">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <Input
                label="Enter Queue Code"
                placeholder="e.g. QL-CLINI-7B42 or CLINIC-101"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                icon={Search}
                required
              />

              <Button type="submit" variant="primary" className="w-full">
                <span>Find Queue</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {queueError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">Queue Not Found</p>
                  <p className="mt-0.5">{queueError}</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : loadingQueue && !queueInfo ? (
        <Card className="p-12 text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
          <p className="text-sm text-slate-400">Loading live queue status...</p>
        </Card>
      ) : ticketData ? (
        /* Screen 2: Active Ticket Display & Live Position Tracker */
        <div className="space-y-6 animate-fade-in">
          {/* Urgent Callout Alert if Called */}
          {(isCalled || isServing) && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/25 text-emerald-100 space-y-2 animate-pulse">
              <div className="flex items-center gap-2.5 text-base font-bold text-white">
                <Volume2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <span>IT IS YOUR TURN! PLEASE PROCEED TO THE DESK</span>
              </div>
              <p className="text-xs text-emerald-200">
                Token <strong className="text-white">#{ticketData.ticket.tokenNumber}</strong> has been summoned to the service counter.
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-600/50 text-emerald-200 text-sm flex items-center gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>Your session has been completed. Thank you for your visit!</span>
            </div>
          )}

          {isSkipped && (
            <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-600/50 text-amber-200 text-sm flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <span>Your ticket was marked as skipped. Please speak with desk staff if you missed your call.</span>
            </div>
          )}

          {/* Main Digital Ticket Card */}
          <Card className="p-6 sm:p-8 border-indigo-500/40 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-indigo-950/30 text-center space-y-6 shadow-2xl">
            {/* Header info */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {ticketData.queue?.business?.name || 'Service Venue'}
                </span>
                <span>•</span>
                <span className="text-xs font-semibold text-indigo-400">
                  {ticketData.queue?.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">Code: {ticketData.queue?.queueCode}</p>
            </div>

            {/* Giant Token Display */}
            <div className="py-4 space-y-2">
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Your Assigned Token
              </span>
              <div className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-100 to-white font-mono tracking-tight">
                #{ticketData.ticket?.tokenNumber}
              </div>
              <div className="text-base font-bold text-white">{ticketData.ticket?.customerName}</div>
            </div>

            {/* Status Pill */}
            <div className="flex justify-center">
              <Badge
                size="lg"
                variant={
                  isCalled || isServing
                    ? 'success'
                    : isCompleted
                    ? 'cyan'
                    : isSkipped
                    ? 'warning'
                    : 'indigo'
                }
                dot={true}
              >
                {ticketData.ticket?.status?.toUpperCase()}
              </Badge>
            </div>

            {/* Real-time Position & Wait Time Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Ahead</span>
                <p className="text-2xl font-black text-white font-mono">{ticketData.peopleAhead}</p>
                <span className="text-[10px] text-slate-500">people</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Wait Time</span>
                <p className="text-2xl font-black text-white font-mono">
                  {ticketData.estimatedWaitTimeMinutes > 0 ? `~${ticketData.estimatedWaitTimeMinutes}` : '0'}
                </p>
                <span className="text-[10px] text-slate-500">mins</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Serving</span>
                <p className="text-2xl font-black text-white font-mono">
                  {ticketData.queue?.currentlyServing > 0 ? `#${ticketData.queue.currentlyServing}` : '—'}
                </p>
                <span className="text-[10px] text-slate-500">now</span>
              </div>
            </div>

            {/* Actions: Manual Refresh, Share & Leave */}
            <div className="flex items-center justify-between pt-4 gap-3 border-t border-slate-800/60">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                <span>Check Live Status</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  title="Share ticket link"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Share'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLeaveQueue}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Release
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* Screen 3: Queue Details & Join Form */
        <div className="space-y-6 animate-fade-in">
          {/* Queue Overview Header Card */}
          <Card className="p-6 border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-white">{queue?.name}</h1>
                  <Badge
                    variant={
                      queue?.status === 'active'
                        ? 'success'
                        : queue?.status === 'paused'
                        ? 'warning'
                        : 'danger'
                    }
                    dot={true}
                  >
                    {queue?.status?.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{queue?.business?.name}</span>
                  <span>•</span>
                  <span className="font-mono text-indigo-300">{queue?.queueCode}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Now Serving</span>
                <p className="text-2xl font-black text-white font-mono">
                  {queue?.currentlyServing > 0 ? `#${queue.currentlyServing}` : 'Ready'}
                </p>
              </div>
            </div>

            {queue?.description && (
              <p className="text-xs text-slate-300">{queue.description}</p>
            )}

            {/* Status alerts for Paused or Closed */}
            {queue?.status === 'paused' && (
              <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>This queue is temporarily paused by staff. Check back shortly.</span>
              </div>
            )}

            {queue?.status === 'closed' && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>This queue is closed for the day.</span>
              </div>
            )}

            {/* Waiting line stats */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500">Waiting in Line</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">
                  {queueInfo?.stats?.waitingCount || 0}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500">Est. Wait for New Joiner</span>
                <p className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
                  ~{queueInfo?.stats?.estimatedWaitMinutes || 0} mins
                </p>
              </div>
            </div>
          </Card>

          {/* Customer Join Queue Form */}
          <Card className="p-6 sm:p-8 border-slate-800 shadow-2xl space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Join Queue & Get Token</h2>
              <p className="text-xs text-slate-400">
                Enter your details to take a contactless digital place in line.
              </p>
            </div>

            {joinError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinQueue} className="space-y-4">
              <Input
                label="Your Full Name"
                placeholder="e.g. Jane Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                icon={User}
                disabled={queue?.status !== 'active' || joiningQueue}
                required
              />

              <Input
                label="Mobile Number or Email (Optional)"
                placeholder="e.g. 555-0199 or name@example.com"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                icon={Phone}
                disabled={queue?.status !== 'active' || joiningQueue}
              />
              <p className="text-[11px] text-slate-500">
                Your contact details are strictly private and never shared publicly.
              </p>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-sm font-bold shadow-indigo-600/30"
                isLoading={joiningQueue}
                disabled={queue?.status !== 'active'}
              >
                <span>Take Token & Join Line</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerQueuePage;
