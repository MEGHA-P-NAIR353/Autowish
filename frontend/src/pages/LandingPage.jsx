import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, Users, Mail, Sparkles, Clock, BarChart3, 
  Shield, Zap, Award, ChevronRight, Check 
} from 'lucide-react';
import FeatureCard from '../components/FeatureCard';
import { AmbientBackground, ThemeToggle, GlassCard } from '../components/ui';

const LandingPage = () => {
  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Wishes",
      description: "Generate unique, heartfelt greetings for every occasion using Google Gemini AI."
    },
    {
      icon: Calendar,
      title: "Smart Event Reminders",
      description: "Never miss a birthday or anniversary. Automatic reminders and scheduling."
    },
    {
      icon: Mail,
      title: "Automated Email Delivery",
      description: "Schedule and send personalized emails automatically on the exact date."
    },
    {
      icon: Users,
      title: "Contact Management",
      description: "Organize all your contacts with birthdays, anniversaries and custom events."
    },
    {
      icon: Clock,
      title: "Recurring Schedules",
      description: "Set recurring wishes for birthdays and anniversaries with full control."
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Track wishes sent, delivery rates, engagement and AI usage."
    }
  ];

  const testimonials = [
    {
      name: "Anabella",
      quote: "AutoWish has connected me with hundreds of people. The automation and AI-generated wishes are incredible!",
      role: "Marketing Manager"
    },
    {
      name: "Ravi Sharma",
      quote: "My favorite tool. Never missed a single birthday since using AutoWish.",
      role: "CEO, TechNova"
    },
    {
      name: "Priya Patel",
      quote: "The AI greetings are so thoughtful. My clients are always impressed!",
      role: "Freelance Designer"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "0",
      period: "forever",
      features: ["Up to 50 contacts", "Basic AI greetings", "10 scheduled wishes/mo", "Email logs"],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Pro",
      price: "19",
      period: "per month",
      features: ["Unlimited contacts", "Unlimited AI greetings", "Unlimited schedules", "CSV export & import", "Priority support"],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Business",
      price: "49",
      period: "per month",
      features: ["Everything in Pro", "Team collaboration", "Advanced analytics", "Custom branding", "Dedicated support"],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-app text-fg relative overflow-hidden">
      {/* Navbar */}
      <nav className="border-b border-line bg-app/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
              <span className="font-bold text-lg text-white">A</span>
            </div>
            <div className="font-bold text-2xl tracking-tight text-fg">AutoWish</div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-muted hover:text-fg transition-colors">Features</a>
            <a href="#pricing" className="text-muted hover:text-fg transition-colors">Pricing</a>
            <a href="#testimonials" className="text-muted hover:text-fg transition-colors">Testimonials</a>
            <a href="#faq" className="text-muted hover:text-fg transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted hover:text-fg transition-colors">Login</Link>
            <Link to="/register" className="btn-primary text-sm px-5 py-2">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative">
        <AmbientBackground />

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-surface/80 border border-line text-xs font-semibold mb-6 shadow-sm">
                <span className="text-primary mr-2">✦</span> 
                <span className="text-fg">AI-Powered • 2026</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[1.05] font-bold tracking-[-1.5px] text-fg">
                Automate Joyful<br />Moments
              </h1>
              <p className="mt-5 max-w-md text-muted text-lg leading-relaxed">
                AI-powered wishes, smart reminders, and heartfelt greetings for every special occasion.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary px-8 py-3.5 text-base font-semibold shadow-lg shadow-primary/20">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn-secondary px-8 py-3.5 text-base font-semibold">
                  Login
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-4 text-xs text-subtle">
                <div>Trusted by 12k+ users worldwide</div>
                <div className="flex -space-x-1.5">
                  {[1,2,3,4].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/32?img=${i+20}`} className="w-6 h-6 rounded-full ring-2 ring-app" alt="user" />
                  ))}
                </div>
              </div>
            </div>

            {/* Hero Illustration Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative bg-surface/80 backdrop-blur-xl rounded-3xl p-8 border border-line shadow-2xl overflow-hidden">
                <div className="absolute top-6 right-6 flex gap-1.5">
                  <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white"><span className="text-[11px]">🎁</span></div>
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white"><span className="text-[11px]">✉️</span></div>
                </div>

                <div className="text-center pt-6">
                  <div className="flex justify-center mb-5">
                    <div className="relative">
                      <div className="text-7xl">🎈</div>
                      <div className="absolute -top-1 -right-1 w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-xs shadow-xl">🎂</div>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-fg mb-1">Automate Joyful Moments</h3>
                  <p className="text-sm text-muted">AI-powered wishes for every occasion</p>

                  <div className="flex gap-2.5 justify-center mt-7">
                    <Link to="/register" className="btn-primary text-xs px-5 py-2 font-semibold">Get Started</Link>
                    <a href="#features" className="btn-secondary text-xs px-5 py-2 font-semibold">Learn More</a>
                  </div>
                </div>
              </div>

              {/* Floating notification pill */}
              <div className="absolute -right-3 -top-3 bg-surface/90 backdrop-blur-md border border-line px-3.5 py-2 rounded-2xl text-xs font-medium text-fg shadow-xl hidden lg:block">
                ✨ 4,832 wishes sent today
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y border-line bg-surface/50 backdrop-blur-sm py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div><div className="text-4xl font-extrabold text-fg">128k</div><div className="text-muted text-xs uppercase tracking-wider mt-1">Wishes Sent</div></div>
          <div><div className="text-4xl font-extrabold text-fg">41k</div><div className="text-muted text-xs uppercase tracking-wider mt-1">Active Users</div></div>
          <div><div className="text-4xl font-extrabold text-fg">92k</div><div className="text-muted text-xs uppercase tracking-wider mt-1">Events Tracked</div></div>
          <div><div className="text-4xl font-extrabold text-fg">99.8%</div><div className="text-muted text-xs uppercase tracking-wider mt-1">Delivery Rate</div></div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <div className="text-primary font-bold uppercase tracking-[2px] text-xs mb-2">POWERFUL FEATURES</div>
          <h2 className="text-4xl font-bold tracking-tight text-fg">
            Everything you need to never<br />miss a special moment again
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div id="testimonials" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-10 text-center md:text-left">
          <div className="uppercase tracking-[2px] text-xs font-bold text-primary">LOVED BY USERS</div>
          <h3 className="text-3xl font-bold text-fg mt-1">Real stories from real people</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-surface/70 backdrop-blur-md border border-line rounded-3xl p-6 shadow-sm hover:border-line-strong transition-all">
              <p className="italic text-muted leading-relaxed">“{t.quote}”</p>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-line/50">
                <div className="w-9 h-9 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-xs">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm text-fg">{t.name}</div>
                  <div className="text-xs text-subtle">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="bg-surface/40 border-y border-line py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-primary font-bold uppercase tracking-[2px] text-xs">SIMPLE PRICING</div>
            <h3 className="text-4xl font-bold text-fg mt-1">Start for free. Upgrade when you need.</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-surface/80 backdrop-blur-md rounded-3xl border p-7 relative transition-all ${
                  plan.popular
                    ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary'
                    : 'border-line shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-6 px-3.5 py-0.5 text-xs bg-primary text-white rounded-full font-bold shadow-md">
                    Most Popular
                  </div>
                )}
                <div>
                  <div className="font-bold text-lg text-fg">{plan.name}</div>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-5xl font-extrabold text-fg">${plan.price}</span>
                    <span className="text-muted ml-1 text-sm">/{plan.period}</span>
                  </div>
                </div>
                <ul className="mt-6 mb-8 space-y-3 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-muted">
                      <Check size={15} className="text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-xl font-semibold transition-all ${
                    plan.popular ? 'btn-primary shadow-md' : 'btn-secondary'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" className="max-w-4xl mx-auto px-6 py-24">
        <h3 className="text-center text-3xl font-bold text-fg mb-12">Frequently Asked Questions</h3>
        
        <div className="space-y-4">
          {[
            ["Is the AI free to use?", "Yes, we use Google Gemini free tier. You get generous limits included."],
            ["Can I import contacts from CSV?", "Yes. Import and export contacts via CSV or Excel in one click."],
            ["How accurate is the scheduling?", "We use APScheduler and timezones. 99.8% delivery rate."],
            ["Do you support recurring events?", "Absolutely. Set yearly birthdays, anniversaries and custom recurrences."]
          ].map(([q, a], idx) => (
            <div key={idx} className="bg-surface/70 backdrop-blur-md border border-line rounded-2xl p-5 shadow-sm">
              <div className="font-semibold text-fg mb-1.5">{q}</div>
              <div className="text-sm text-muted leading-relaxed">{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="border-t border-line bg-raised/30 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-fg">Ready to never miss another moment?</h2>
          <p className="text-muted mt-3 text-base">Join thousands automating heartfelt wishes.</p>
          <Link to="/register" className="inline-block mt-7 btn-primary px-10 py-3.5 text-base font-semibold shadow-lg shadow-primary/20">
            Get Started for Free
          </Link>
          <div className="mt-5 text-xs text-subtle">No credit card required • 14-day Pro trial</div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-line bg-surface/60 backdrop-blur-md py-10 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-y-5 text-subtle">
          <div>© 2026 AutoWish AI. All rights reserved.</div>
          <div className="flex gap-x-6">
            <a href="#" className="hover:text-fg transition-colors">Privacy</a>
            <a href="#" className="hover:text-fg transition-colors">Terms</a>
            <a href="#" className="hover:text-fg transition-colors">Support</a>
            <a href="#" className="hover:text-fg transition-colors">Blog</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
