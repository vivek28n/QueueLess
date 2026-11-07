import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle,
  Play,
  Plus,
  RefreshCw,
  Layers,
  LogOut,
  Building2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Phone,
  UserCheck,
  UserX,
  X,
  Radio,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State: Queues & Selection
  const [queues, setQueues] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [selectedQueueDetails, setSelectedQueueDetails] = useState(null);
  const [loadingQueues, setLoadingQueues] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // State: Create Queue Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [newQueueDescription, setNewQueueDescription] = useState('');
  const [newQueueServiceTime, setNewQueueServiceTime] = useState('5');
  const [newQueueCustomCode, setNewQueueCustomCode] = useState('');
  const [createQueueError, setCreateQueueError] = useState(null);
  const [creatingQueue, setCreatingQueue] = useState(false);

  // State: Feedback / Notifications
  const [notification, setNotification] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch all queues belonging to this business
  const fetchQueues = useCallback(async (selectId = null) => {
    try {
      setLoadingQueues(true);
      const res = await api.get('/queues');
      const queueList = res.data?.data?.queues || [];
      setQueues(queueList);

      if (queueList.length > 0) {
        // Maintain selection or select provided id or default to first
        setSelectedQueueId((prev) => {
          if (selectId) return selectId;
          if (prev && queueList.some((q) => q._id === prev)) return prev;
          return queueList[0]._id;
        });
      } else {
        setSelectedQueueId(null);
        setSelectedQueueDetails(null);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load queues.',
      });
    } finally {
      setLoadingQueues(false);
    }
  }, []);

  // Fetch details & tickets for the selected queue
  const fetchQueueDetails = useCallback(async (queueId) => {
    if (!queueId) return;
    try {
      setLoadingDetails(true);
      const res = await api.get(`/queues/${queueId}`);
      setSelectedQueueDetails(res.data?.data || null);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load queue details.',
      });
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  useEffect(() => {
    if (selectedQueueId) {
      fetchQueueDetails(selectedQueueId);
    }
  }, [selectedQueueId, fetchQueueDetails]);

  // Handle Logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper: Show temporary notification toast
  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Handle Create Queue
  const handleCreateQueue = async (e) => {
    e.preventDefault();
    setCreateQueueError(null);

    if (!newQueueName.trim()) {
      setCreateQueueError('Queue name is required.');
      return;
    }

    try {
      setCreatingQueue(true);
      const payload = {
        name: newQueueName.trim(),
        description: newQueueDescription.trim(),
        averageServiceTime: Number(newQueueServiceTime) || 5,
      };
      if (newQueueCustomCode.trim()) {
        payload.queueCode = newQueueCustomCode.trim().toUpperCase();
      }

      const res = await api.post('/queues', payload);
      const created = res.data?.data?.queue;

      setIsCreateModalOpen(false);
      setNewQueueName('');
      setNewQueueDescription('');
      setNewQueueServiceTime('5');
      setNewQueueCustomCode('');

      showToast('success', `Queue "${created.name}" created with code: ${created.queueCode}`);
      await fetchQueues(created._id);
    } catch (err) {
      setCreateQueueError(err.message || 'Failed to create queue.');
    } finally {
      setCreatingQueue(false);
    }
  };

  // Handle Update Queue Status (Active, Paused, Closed)
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedQueueId) return;
    try {
      setActionLoading(true);
      await api.patch(`/queues/${selectedQueueId}`, { status: newStatus });
      showToast('success', `Queue status changed to ${newStatus.toUpperCase()}`);
      await fetchQueueDetails(selectedQueueId);
      // update in parent list
      setQueues((prev) =>
        prev.map((q) => (q._id === selectedQueueId ? { ...q, status: newStatus } : q))
      );
    } catch (err) {
      showToast('error', err.message || 'Failed to update queue status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Call Next Customer
  const handleCallNext = async () => {
    if (!selectedQueueId) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/queues/${selectedQueueId}/next`);
      const { ticket } = res.data?.data || {};
      showToast('success', `Called Token #${ticket?.tokenNumber} (${ticket?.customerName}) to counter!`);
      await fetchQueueDetails(selectedQueueId);
      await fetchQueues(selectedQueueId);
    } catch (err) {
      showToast('error', err.message || 'Failed to call next customer.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Complete Ticket
  const handleCompleteTicket = async (ticketId) => {
    if (!ticketId) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/tickets/${ticketId}/complete`);
      const { ticket } = res.data?.data || {};
      showToast('success', `Completed Token #${ticket?.tokenNumber} (${ticket?.customerName})`);
      await fetchQueueDetails(selectedQueueId);
      await fetchQueues(selectedQueueId);
    } catch (err) {
      showToast('error', err.message || 'Failed to complete ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Skip Ticket
  const handleSkipTicket = async (ticketId) => {
    if (!ticketId) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/tickets/${ticketId}/skip`);
      const { ticket } = res.data?.data || {};
      showToast('warning', `Skipped Token #${ticket?.tokenNumber} (${ticket?.customerName})`);
      await fetchQueueDetails(selectedQueueId);
      await fetchQueues(selectedQueueId);
    } catch (err) {
      showToast('error', err.message || 'Failed to skip ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Public Queue Link / Code
  const copyQueueCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const selectedQueue = selectedQueueDetails?.queue || queues.find((q) => q._id === selectedQueueId);
  const stats = selectedQueueDetails?.stats || {
    waitingCount: 0,
    servingCount: 0,
    completedCount: 0,
    currentlyServing: selectedQueue?.currentlyServing || 0,
    estimatedWaitMinutes: 0,
  };
  const activeTicket = selectedQueueDetails?.activeTicket;
  const waitingTickets = selectedQueueDetails?.waitingTickets || [];
  const recentTickets = selectedQueueDetails?.recentTickets || [];

  return (
    <div className="min-h-[calc(100vh-144px)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-xl transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Organization Header */}
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
              Sector: {user?.business?.industry || 'General'}
            </span>
            <span>•</span>
            <span className="text-slate-400">
              Staff: <strong className="text-white">{user?.name}</strong>
            </span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Queue</span>
          </Button>

          <button
            type="button"
            onClick={() => {
              fetchQueues(selectedQueueId);
              if (selectedQueueId) fetchQueueDetails(selectedQueueId);
            }}
            disabled={loadingQueues || loadingDetails}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors"
            title="Refresh queues"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loadingQueues || loadingDetails ? 'animate-spin text-indigo-400' : 'text-slate-400'
              }`}
            />
            <span>Refresh</span>
          </button>

          <Button size="sm" variant="outline" onClick={handleLogout} className="text-slate-300 hover:text-rose-400">
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* Queue Selection Bar (Tabs / Pills) */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full sm:w-auto">
          {queues.map((q) => (
            <button
              key={q._id}
              onClick={() => setSelectedQueueId(q._id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
                selectedQueueId === q._id
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Layers className={`h-3.5 w-3.5 ${selectedQueueId === q._id ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span className="font-semibold">{q.name}</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                {q.queueCode}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  q.status === 'active'
                    ? 'bg-emerald-400'
                    : q.status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
            </button>
          ))}
          {queues.length === 0 && !loadingQueues && (
            <span className="text-xs text-slate-500 italic">No queues found for this business.</span>
          )}
        </div>
      </div>

      {/* Empty State: No Queues Created */}
      {queues.length === 0 && !loadingQueues ? (
        <Card className="text-center py-20 px-4 space-y-5 max-w-2xl mx-auto border-dashed border-slate-800">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Layers className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No Service Queues Active</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Set up your first counter or walk-in line to begin issuing digital tokens, tracking waiting patrons, and dispatching counter summons.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Create First Queue</span>
          </Button>
        </Card>
      ) : selectedQueue ? (
        <>
          {/* Active Queue Details Header Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{selectedQueue.name}</h2>
                <Badge
                  variant={
                    selectedQueue.status === 'active'
                      ? 'success'
                      : selectedQueue.status === 'paused'
                      ? 'warning'
                      : 'danger'
                  }
                  dot={true}
                >
                  {selectedQueue.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">{selectedQueue.description || 'No description provided.'}</p>
            </div>

            {/* Queue Code & Public Link */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
                <span className="text-slate-500">CODE:</span>
                <span className="text-indigo-400 font-bold">{selectedQueue.queueCode}</span>
                <button
                  type="button"
                  onClick={() => copyQueueCode(selectedQueue.queueCode)}
                  className="hover:text-white p-0.5 ml-1 transition-colors"
                  title="Copy Queue Code"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <Link
                to={`/queue?code=${selectedQueue.queueCode}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/50 border border-indigo-700/40 text-indigo-300 hover:text-white hover:bg-indigo-900/50 text-xs transition-colors"
                title="Open Guest Queue Tracker in New Tab"
              >
                <span>Guest View</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              {/* Status Switcher Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('active')}
                  disabled={actionLoading || selectedQueue.status === 'active'}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedQueue.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('paused')}
                  disabled={actionLoading || selectedQueue.status === 'paused'}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedQueue.status === 'paused'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('closed')}
                  disabled={actionLoading || selectedQueue.status === 'closed'}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedQueue.status === 'closed'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Waiting in Line</span>
                <Users className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">{stats.waitingCount}</span>
                <span className="text-xs text-slate-500">tickets waiting</span>
              </div>
              <p className="text-[11px] text-slate-400">Queued for counter dispatch</p>
            </Card>

            <Card className="p-5 space-y-2 border-indigo-500/30 bg-gradient-to-br from-slate-900/90 to-indigo-950/20">
              <div className="flex items-center justify-between text-indigo-300">
                <span className="text-xs font-semibold uppercase tracking-wider">Now Serving</span>
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">
                  {stats.currentlyServing > 0 ? `#${stats.currentlyServing}` : 'None'}
                </span>
                <span className="text-xs text-slate-400">
                  {activeTicket ? activeTicket.customerName : 'Idle Desk'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-400">
                {activeTicket ? `Called at ${new Date(activeTicket.calledAt).toLocaleTimeString()}` : 'Ready for next token'}
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Served Today</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">{stats.completedCount}</span>
                <span className="text-xs text-slate-500">completed</span>
              </div>
              <p className="text-[11px] text-slate-400">Successfully closed visits</p>
            </Card>

            <Card className="p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Est. Waiting Time</span>
                <Clock className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">{stats.estimatedWaitMinutes}</span>
                <span className="text-xs text-slate-500">mins total</span>
              </div>
              <p className="text-[11px] text-slate-400">Paced @ {selectedQueue.averageServiceTime || 5}m / patron</p>
            </Card>
          </div>

          {/* Main Dashboard Workspace (Two Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Live Waiting Queue Table & Customer Stream */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-800 p-6 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-indigo-400" />
                    <div>
                      <h3 className="text-base font-bold text-white">Live Waiting Queue</h3>
                      <p className="text-xs text-slate-400">
                        {waitingTickets.length} patron{waitingTickets.length === 1 ? '' : 's'} currently waiting in order of arrival
                      </p>
                    </div>
                  </div>
                  <Badge variant="indigo" size="sm">
                    {waitingTickets.length} in Line
                  </Badge>
                </div>

                {/* Waiting Tickets List */}
                {waitingTickets.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
                    <div className="h-10 w-10 rounded-xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">Waiting Line is Empty</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      All patrons have been attended to. Share queue code{' '}
                      <strong className="text-indigo-400 font-mono">{selectedQueue.queueCode}</strong> with arriving visitors.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 pl-2">Token</th>
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Contact</th>
                          <th className="pb-3">Joined</th>
                          <th className="pb-3 text-right pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {waitingTickets.map((t, idx) => (
                          <tr key={t._id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 pl-2 font-mono font-bold text-indigo-300">
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-700/40 text-xs">
                                #{t.tokenNumber}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <span className="font-medium text-white">{t.customerName}</span>
                              {idx === 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                                  Next Up
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-xs text-slate-400">
                              {t.customerContact ? (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="h-3 w-3 text-slate-500" />
                                  {t.customerContact}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-3.5 text-xs text-slate-400">
                              {new Date(t.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSkipTicket(t._id)}
                                disabled={actionLoading}
                                className="text-xs py-1 px-2.5 text-slate-400 hover:text-amber-400 hover:border-amber-500/40"
                              >
                                Skip
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Recent Activity Log */}
              {recentTickets.length > 0 && (
                <Card className="border-slate-800 p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-slate-300">Recent Service History</h3>
                    <span className="text-xs text-slate-500">Last {recentTickets.length} entries</span>
                  </div>
                  <div className="divide-y divide-slate-800/40 text-xs">
                    {recentTickets.map((rt) => (
                      <div key={rt._id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-slate-300 font-bold">#{rt.tokenNumber}</span>
                          <span className="text-white">{rt.customerName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            size="sm"
                            variant={
                              rt.status === 'completed'
                                ? 'success'
                                : rt.status === 'skipped'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {rt.status.toUpperCase()}
                          </Badge>
                          <span className="text-slate-500 font-mono">
                            {new Date(rt.updatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Column 3: Desk Summon & Dispatch Control */}
            <div className="space-y-6">
              {/* Now Serving Control Card */}
              <Card className="border-indigo-500/30 bg-gradient-to-b from-slate-900 to-indigo-950/30 p-6 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white">Desk Dispatch</h3>
                  <Badge variant="indigo" size="sm">
                    Counter Control
                  </Badge>
                </div>

                {/* Active Serving Box */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/20 text-center space-y-3">
                  <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                    Currently Attending
                  </span>
                  {activeTicket ? (
                    <div className="space-y-2">
                      <div className="text-4xl font-black text-white font-mono tracking-tight text-indigo-400">
                        #{activeTicket.tokenNumber}
                      </div>
                      <div className="text-base font-bold text-white">{activeTicket.customerName}</div>
                      {activeTicket.customerContact && (
                        <div className="text-xs text-slate-400 font-mono">{activeTicket.customerContact}</div>
                      )}
                      <div className="pt-2 text-[11px] text-emerald-400">
                        Status: <span className="font-semibold uppercase">{activeTicket.status}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 space-y-1">
                      <p className="text-2xl font-bold text-slate-500 font-mono">STANDBY</p>
                      <p className="text-xs text-slate-400">No active ticket at counter</p>
                    </div>
                  )}
                </div>

                {/* Counter Primary Actions */}
                <div className="space-y-2.5">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCallNext}
                    isLoading={actionLoading}
                    disabled={waitingTickets.length === 0 || selectedQueue.status === 'closed'}
                    className="w-full text-sm font-bold shadow-indigo-600/30"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Call Next Customer</span>
                    {waitingTickets.length > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full bg-indigo-900/80 text-xs font-mono">
                        #{waitingTickets[0].tokenNumber}
                      </span>
                    )}
                  </Button>

                  {activeTicket && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => handleCompleteTicket(activeTicket._id)}
                        disabled={actionLoading}
                        className="bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/50"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Complete</span>
                      </Button>

                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => handleSkipTicket(activeTicket._id)}
                        disabled={actionLoading}
                        className="bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border-amber-700/50"
                      >
                        <UserX className="h-4 w-4" />
                        <span>Skip</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Queue Summary / Quick Stats */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Queue Status</span>
                    <span className="capitalize text-white font-medium">{selectedQueue.status}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Average Service Time</span>
                    <span className="text-white font-mono">{selectedQueue.averageServiceTime || 5} mins</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Tokens Issued</span>
                    <span className="text-white font-mono">{selectedQueue.currentTokenNumber || 0}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}

      {/* Modal: Create Queue */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-lg border-slate-800 shadow-2xl space-y-5 p-6 bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Create New Queue</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createQueueError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createQueueError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQueue} className="space-y-4">
              <Input
                label="Queue Name"
                placeholder="e.g. General Consultation, Express Checkout"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                required
              />

              <div className="w-full space-y-1.5">
                <label className="block text-xs font-semibold tracking-wider uppercase text-slate-400">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note about the queue purpose or requirements..."
                  value={newQueueDescription}
                  onChange={(e) => setNewQueueDescription(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Avg Service Time (Minutes)"
                  type="number"
                  min="1"
                  max="240"
                  placeholder="5"
                  value={newQueueServiceTime}
                  onChange={(e) => setNewQueueServiceTime(e.target.value)}
                  required
                />

                <Input
                  label="Custom Code (Optional)"
                  placeholder="e.g. CLINIC-A"
                  value={newQueueCustomCode}
                  onChange={(e) => setNewQueueCustomCode(e.target.value.toUpperCase())}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Leave custom code blank to automatically generate a unique, short queue code.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creatingQueue}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={creatingQueue}>
                  <span>Create Queue</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
