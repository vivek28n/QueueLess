import React, { useState, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  QrCode,
  Zap,
  Clock,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Building2,
  Stethoscope,
  UtensilsCrossed,
  Landmark,
  ShoppingBag,
  Activity,
  Search,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const QueueHeroCanvas = lazy(() => import('../components/landing/QueueHeroCanvas'));

export const LandingPage = () => {
  const [queueCodeInput, setQueueCodeInput] = useState('');

  const industries = [
    { name: 'Healthcare & Clinics', icon: Stethoscope, tag: 'Patient Flow' },
    { name: 'Restaurants & Dining', icon: UtensilsCrossed, tag: 'Table Turnover' },
    { name: 'Banking & Financial', icon: Landmark, tag: 'Counter Security' },
    { name: 'Retail & Commercial', icon: ShoppingBag, tag: 'Walk-in Delight' },
    { name: 'Public & Government', icon: Building2, tag: 'Citizen Services' },
  ];

  const steps = [
    {
      step: '01',
      title: 'Scan QR or Enter Code',
      desc: 'Patrons scan the front-desk QR code with any smartphone camera or enter a queue code directly in their mobile browser.',
      badge: 'Zero App Friction',
    },
    {
      step: '02',
      title: 'Live Place-in-Line Tracking',
      desc: 'Customers monitor their live position, people ahead, and rolling estimated wait minutes while free to roam or wait comfortably.',
      badge: 'Low-Latency Sync',
    },
    {
      step: '03',
      title: 'Instant Counter Summon',
      desc: 'Desk staff trigger "Call Next" with 1-click. The summoned customer receives an instant audio-visual dispatch alert on mobile.',
      badge: 'Immediate Alert',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-[#090d16]">
      {/* Background ambient lighting */}
      <div className="gradient-glow-indigo top-0 left-1/3 -translate-x-1/2 w-[700px] h-[450px]" />
      <div className="gradient-glow-cyan top-96 right-10 w-[500px] h-[400px]" />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Hero Left Content Column */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Live Operational Badge */}
            <div className="inline-flex items-center">
              <Badge variant="indigo" size="md" dot={true} className="py-1 px-3.5 border-indigo-700/40">
                <span className="font-semibold text-indigo-300">QueueLess 1.0</span>
                <span className="text-slate-400">· Real-Time Queue Infrastructure</span>
              </Badge>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Eliminate Physical Lines.{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-200 bg-clip-text text-transparent">
                Streamline Waiting Live.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed font-normal">
              A real-time live queue operating system. Customers join via contactless QR check-in and track their live place on mobile. Counter administrators manage dispatches with zero friction.
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link to="/register">
                <Button size="lg" variant="primary" className="w-full sm:w-auto shadow-indigo-600/30">
                  <span>Deploy Your Queue Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Link to="/queue">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-700/80 bg-slate-900/60 hover:bg-slate-800">
                  <Smartphone className="h-4 w-4 text-cyan-400" />
                  <span>Join / Track a Live Queue</span>
                </Button>
              </Link>
            </div>

            {/* Technical Proof Pills */}
            <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-800/80 text-left">
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Low-Latency Sync</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Socket.IO real-time</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Zero Downloads</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Mobile browser entry</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Atomic Tokens</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Zero duplicate collisions</p>
              </div>
            </div>
          </div>

          {/* Hero Right Column: Custom 3D Queue Visualization */}
          <div className="lg:col-span-6 w-full">
            <Suspense
              fallback={
                <div className="w-full h-[420px] sm:h-[480px] lg:h-[540px] flex items-center justify-center rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse">
                  <div className="text-center space-y-2">
                    <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping mx-auto" />
                    <p className="text-xs text-slate-500 font-mono">Initializing 3D Queue Engine...</p>
                  </div>
                </div>
              }
            >
              <QueueHeroCanvas />
            </Suspense>
          </div>
        </div>

        {/* Quick Queue-Code Access Utility Bar */}
        <div className="mt-14 max-w-2xl mx-auto">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-3 w-full flex-1 px-3 py-1">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Have a Queue Code? (e.g. QL-APEX-4B2C)"
                value={queueCodeInput}
                onChange={(e) => setQueueCodeInput(e.target.value)}
                className="bg-transparent flex-1 text-sm text-white placeholder-slate-500 focus:outline-none uppercase font-mono tracking-wider"
              />
            </div>
            <Link
              to={queueCodeInput ? `/queue?code=${encodeURIComponent(queueCodeInput.trim().toUpperCase())}` : '/queue'}
              className="w-full sm:w-auto"
            >
              <Button size="md" variant="secondary" className="w-full sm:w-auto px-5 bg-slate-800 hover:bg-slate-700 text-white font-semibold">
                <span>Track Live</span>
                <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
              </Button>
            </Link>
          </div>
          <p className="text-center text-[11px] text-slate-500 mt-2">
            Patron entrance: Instant live position lookup without downloading any app or creating an account.
          </p>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="py-20 bg-[#070a13] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <Badge variant="cyan">Engine Capabilities</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered for Speed, Reliability & Operational Flow
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Everything required to orchestrate physical venue traffic digitally with sub-millisecond precision.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Feature 1: Large Spotlight Card (WebSocket Engine) */}
            <div className="md:col-span-7 bg-gradient-to-br from-slate-900 via-[#0d1424] to-[#0a0f1d] border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Zap className="h-6 w-6" />
                  </div>
                  <Badge variant="indigo" dot={true}>
                    Bi-Directional WebSocket
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Real-Time WebSocket Synchronization
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
                  Zero polling latency. When an administrator clicks &quot;Call Next&quot;, every position shift, wait-time recalculation, and ticket summons streams instantly to patrons and counter desks via persistent Socket.IO rooms.
                </p>
              </div>

              {/* Live Metric Simulation Pill */}
              <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Illustrative Latency</p>
                  <p className="text-lg font-bold text-cyan-400 font-mono">&lt; 15 ms</p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Protocol</p>
                  <p className="text-lg font-bold text-white font-mono">WS / Polling</p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Sync Mode</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">Authoritative</p>
                </div>
              </div>
            </div>

            {/* Feature 2: Contactless QR Code Entry */}
            <div className="md:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50">
                    Zero App Friction
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">Contactless QR Check-In</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Generate high-resolution counter QR codes with branded PNG export for desk displays. Patrons scan with their standard phone camera and enter the line instantly.
                </p>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-semibold text-white">Counter Signage Export</p>
                  <p className="text-[11px] text-slate-400 truncate">One-click PNG canvas export ready to print</p>
                </div>
              </div>
            </div>

            {/* Feature 3: Smart Wait-Time Forecasting */}
            <div className="md:col-span-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Algorithmic</span>
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic Wait-Time Estimates</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Calculates rolling wait projections dynamically based on average counter serving speed and waiting queue depth.
              </p>
            </div>

            {/* Feature 4: Concurrency-Safe Atomic Tokens */}
            <div className="md:col-span-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Concurrency Safe</span>
              </div>
              <h3 className="text-lg font-bold text-white">Atomic Sequential Tokens</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Atomic MongoDB operations with compound unique indexing prevent token collisions during simultaneous patron traffic surges.
              </p>
            </div>

            {/* Feature 5: Multi-Counter Desk Dispatch */}
            <div className="md:col-span-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-cyan-600/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Desk Operations</span>
              </div>
              <h3 className="text-lg font-bold text-white">Admin Dispatch Desk</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Single-click &quot;Call Next&quot;, &quot;Skip&quot;, and &quot;Complete&quot; workflows with state-machine validation and multi-queue switching.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Badge variant="indigo">Simple Process</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Seamless in 3 Simple Steps
          </h2>
          <p className="text-slate-400 text-base">
            No friction for visiting guests, zero training overhead for counter staff.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl font-black text-indigo-500/40 font-mono">
                  {item.step}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60">
                  {item.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Industry Verticals Section */}
      <section className="py-16 bg-[#0a0f1d] border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs uppercase font-bold tracking-widest text-slate-400">
              Built For High-Density Operations & Venue Foot-Traffic
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {industries.map((ind, i) => {
              const Icon = ind.icon;
              return (
                <div
                  key={i}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2 hover:border-slate-700 transition-colors"
                >
                  <Icon className="h-6 w-6 text-indigo-400" />
                  <span className="text-sm font-semibold text-slate-200">{ind.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{ind.tag}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 border border-indigo-500/30 rounded-3xl p-10 sm:p-16 relative overflow-hidden shadow-2xl">
          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to modernize your waiting room?
            </h2>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
              Launch your first queue in under 2 minutes. Free multi-tenant onboarding with complete real-time WebSocket orchestration.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link to="/register">
                <Button size="lg" variant="primary">
                  <span>Create Business Account</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/admin">
                <Button size="lg" variant="secondary">
                  <span>View Admin Portal</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
