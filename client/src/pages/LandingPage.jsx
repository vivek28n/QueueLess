import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  QrCode,
  Zap,
  Clock,
  Smartphone,
  ArrowRight,
  Bell,
  Sparkles,
  BarChart3,
  Building2,
  Stethoscope,
  UtensilsCrossed,
  Landmark,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

export const LandingPage = () => {
  const [queueCodeInput, setQueueCodeInput] = useState('');

  const features = [
    {
      icon: Zap,
      title: 'Real-Time WebSocket Sync',
      description: 'Zero polling lag. Every position shift, counter call, and ticket notification streams instantly to customers via Socket.IO.',
      badge: 'Sub-millisecond',
    },
    {
      icon: QrCode,
      title: 'Contactless QR Check-In',
      description: 'Customers scan a physical or digital counter QR code and join the virtual waiting room instantly without installing an app.',
      badge: 'Zero App Friction',
    },
    {
      icon: Clock,
      title: 'Smart Wait-Time Estimation',
      description: 'Algorithmic wait-time forecasting adapts continuously based on average counter serving speed and active staff capacity.',
      badge: 'Intelligent',
    },
    {
      icon: Users,
      title: 'Multi-Counter Dispatch',
      description: 'Assign customers dynamically across multiple service desks, specialized departments, or VIP priority tracks.',
      badge: 'Enterprise',
    },
    {
      icon: Bell,
      title: 'Automated Status Alerts',
      description: 'Notify customers when their turn is 3 positions away so they can browse freely and return right on time.',
      badge: 'Smart Paging',
    },
    {
      icon: BarChart3,
      title: 'Executive Queue Analytics',
      description: 'Track throughput, peak congestion windows, staff service metrics, and abandon rates with interactive dashboards.',
      badge: 'Data-driven',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Scan or Join Remotely',
      desc: 'Customers scan a venue QR code or enter a queue slug to receive a live digital ticket number instantly.',
    },
    {
      step: '02',
      title: 'Live Position Tracking',
      desc: 'Users view dynamic place-in-line updates, estimated minutes remaining, and live status while free to roam.',
    },
    {
      step: '03',
      title: 'Instant Counter Summon',
      desc: 'Administrators call the next ticket with 1-click; the customer receives an immediate sound and visual alert.',
    },
  ];

  const industries = [
    { name: 'Healthcare & Clinics', icon: Stethoscope, tag: 'Patient Flow' },
    { name: 'Restaurants & Cafes', icon: UtensilsCrossed, tag: 'Table Turnaround' },
    { name: 'Banking & Financial', icon: Landmark, tag: 'Secure Servicing' },
    { name: 'Retail & Flagships', icon: ShoppingBag, tag: 'Customer Delight' },
    { name: 'Public & Government', icon: Building2, tag: 'Citizen Services' },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="gradient-glow-indigo top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px]" />
      <div className="gradient-glow-cyan top-96 right-10 w-[500px] h-[400px]" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center">
            <Badge variant="indigo" size="lg" dot={true} className="py-1 px-4">
              <span className="font-semibold text-indigo-300">QueueLess 1.0</span>
              <span className="text-slate-400">· Next-Gen Real-Time Queue Infrastructure</span>
            </Badge>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Eliminate Physical Lines.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-200 bg-clip-text text-transparent">
              Streamline Waiting Live.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            A real-time live queue operating system. Customers join digitally, wander freely, and monitor their exact turn on mobile. Administrators manage counters with zero friction.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/register">
              <Button size="lg" variant="primary" className="w-full sm:w-auto shadow-indigo-600/30">
                <span>Deploy Your Queue Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/queue">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Smartphone className="h-4 w-4 text-cyan-400" />
                <span>Join / Track a Live Queue</span>
              </Button>
            </Link>
          </div>

          {/* Quick Queue Access Form */}
          <div className="pt-8 max-w-md mx-auto">
            <div className="p-2 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl flex items-center gap-2">
              <input
                type="text"
                placeholder="Have a Queue Code? (e.g. QL-902)"
                value={queueCodeInput}
                onChange={(e) => setQueueCodeInput(e.target.value)}
                className="bg-transparent flex-1 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <Link to={queueCodeInput ? `/queue?code=${encodeURIComponent(queueCodeInput)}` : '/queue'}>
                <Button size="sm" variant="secondary">
                  Track
                </Button>
              </Link>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Instant mobile check-in. No app installation or registration required for guests.
            </p>
          </div>
        </div>

        {/* Hero Interactive Visual Showcase */}
        <div className="mt-16 md:mt-20 relative max-w-5xl mx-auto">
          <div className="rounded-3xl p-1 bg-gradient-to-b from-slate-700/60 via-slate-800/40 to-slate-900/80 shadow-2xl shadow-indigo-950/40">
            <div className="rounded-[22px] bg-[#0c1220] border border-slate-800/90 p-6 md:p-8 overflow-hidden">
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 ml-2 font-mono">
                    queueless.live/hub/health-clinic-counter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="cyan" dot={true}>
                    WebSocket: Active
                  </Badge>
                </div>
              </div>

              {/* Showcase Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Customer View Card */}
                <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-[#0d1424] border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 h-28 w-28 bg-indigo-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Customer Live View
                    </span>
                    <Badge variant="success" dot={true}>
                      In Queue
                    </Badge>
                  </div>

                  <div className="text-center py-6 border-y border-slate-800/80 my-4 space-y-1">
                    <p className="text-xs text-slate-400 uppercase font-medium">Your Ticket</p>
                    <p className="text-5xl font-black tracking-tight text-white font-mono">
                      #A-042
                    </p>
                    <p className="text-xs text-indigo-400 font-semibold pt-1">
                      Now Serving: #A-039 at Counter 2
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
                      <p className="text-[11px] text-slate-400">People Ahead</p>
                      <p className="text-2xl font-bold text-white">2</p>
                    </div>
                    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
                      <p className="text-[11px] text-slate-400">Est. Wait Time</p>
                      <p className="text-2xl font-bold text-cyan-400">~6 mins</p>
                    </div>
                  </div>
                </div>

                {/* Admin Console View */}
                <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Admin Control Console</h4>
                      <p className="text-xs text-slate-400">Counter 01 · General Consultations</p>
                    </div>
                    <Badge variant="indigo">Staff Desk</Badge>
                  </div>

                  {/* Operational stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Waiting</p>
                      <p className="text-xl font-bold text-white mt-0.5">14</p>
                    </div>
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Served Today</p>
                      <p className="text-xl font-bold text-emerald-400 mt-0.5">86</p>
                    </div>
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Avg Service</p>
                      <p className="text-xl font-bold text-indigo-400 mt-0.5">3.8 m</p>
                    </div>
                  </div>

                  {/* Actions mockup */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[140px] bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 rounded-xl py-2 px-3 text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Next in Queue</span>
                    </div>
                    <div className="flex-1 min-w-[140px] bg-slate-800 text-slate-300 rounded-xl py-2 px-3 text-center text-xs font-medium border border-slate-700/60">
                      Recall #A-039
                    </div>
                    <div className="bg-rose-950/30 text-rose-300 border border-rose-800/40 rounded-xl py-2 px-3 text-center text-xs font-medium">
                      Mark No-Show
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-[#070a12]/80 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <Badge variant="cyan">Engine Capabilities</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered for Speed, Reliability & Delight
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Everything required to orchestrate physical foot-traffic digitally with microsecond precision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} hoverEffect={true} className="flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50">
                        {feature.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Badge variant="indigo">Workflow</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Seamless in 3 Simple Steps
          </h2>
          <p className="text-slate-400 text-base">
            No friction for guests, zero training overhead for staff.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 space-y-4"
            >
              <div className="text-4xl font-black text-indigo-500/30 font-mono">
                {item.step}
              </div>
              <h3 className="text-xl font-bold text-white">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Industry Verticals */}
      <section className="py-16 bg-[#0a0f1d] border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs uppercase font-bold tracking-widest text-slate-400">
              Designed For High-Density Operations
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
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/60 border border-indigo-500/30 rounded-3xl p-10 sm:p-16 relative overflow-hidden shadow-2xl">
          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to modernize your waiting room?
            </h2>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
              Launch your first queue in less than 2 minutes. Free trial with complete real-time WebSocket orchestration.
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
