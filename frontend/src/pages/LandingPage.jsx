import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, Users, Mail, Sparkles, Clock, BarChart3, 
  Shield, Zap, Award, ChevronRight 
} from 'lucide-react';
import FeatureCard from '../components/FeatureCard';

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
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Navbar */}
      <nav className="border-b border-[#334155] bg-[#0F172A]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="font-bold text-lg">A</span>
            </div>
            <div className="font-bold text-2xl tracking-tight">AutoWish</div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-[#CBD5E1] hover:text-white">Features</a>
            <a href="#pricing" className="text-[#CBD5E1] hover:text-white">Pricing</a>
            <a href="#testimonials" className="text-[#CBD5E1] hover:text-white">Testimonials</a>
            <a href="#faq" className="text-[#CBD5E1] hover:text-white">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="px-5 py-2 text-sm font-medium text-[#CBD5E1] hover:text-white">Login</Link>
            <Link to="/register" className="btn-primary text-sm px-5 py-[9px]">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Matches image exactly */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-[#1E293B] border border-[#334155] text-sm mb-6">
              <span className="text-blue-400 mr-2">✦</span> 
              <span>AI-Powered • 2026</span>
            </div>

            <h1 className="text-6xl lg:text-6xl leading-[1.05] font-bold tracking-[-1.5px]">
              Automate Joyful<br />Moments
            </h1>
            <p className="mt-5 max-w-md text-[#94A3B8] text-[17px]">
              AI-powered wishes, smart reminders, and heartfelt greetings for every special occasion.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary px-9 py-[13px] text-base">
                Get Started Free
              </Link>
              <Link to="/login" className="btn-secondary px-8 py-[13px] text-base">
                Login
              </Link>
            </div>

            <div className="mt-7 flex items-center gap-6 text-xs text-[#64748B]">
              <div>Trusted by 12k+ users</div>
              <div className="flex -space-x-1">
                {[1,2,3,4].map(i => <img key={i} src={`https://i.pravatar.cc/22?img=${i+20}`} className="w-5 h-5 rounded-full ring-2 ring-[#0F172A]" />)}
              </div>
            </div>
          </div>

          {/* Hero Illustration - Exact match */}
          <div className="lg:col-span-5 relative">
            <div className="relative bg-[#1E293B] rounded-3xl p-8 border border-[#334155] overflow-hidden">
              <div className="absolute top-6 right-6 flex gap-1.5">
                <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center"><span className="text-[11px]">🎁</span></div>
                <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-[11px]">✉️</span></div>
              </div>

              <div className="text-center pt-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="text-7xl">🎈</div>
                    <div className="absolute -top-1 -right-1 w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-xs shadow-xl">🎂</div>
                  </div>
                </div>
                
                <h3 className="text-2xl font-semibold mb-1">Automate Joyful Moments</h3>
                <p className="text-sm text-[#94A3B8]">AI-powered wishes for every occasion</p>

                <div className="flex gap-2 justify-center mt-7">
                  <button className="btn-primary text-sm px-6 py-2">Get Started</button>
                  <button className="btn-secondary text-sm px-6 py-2">Watch Demo</button>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -right-4 -top-4 bg-[#1E293B] border border-[#334155] p-3 rounded-2xl text-xs shadow-lg hidden lg:block">
              4,832 wishes sent today
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y border-[#334155] py-6">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div><div className="text-4xl font-bold">128k</div><div className="text-[#64748B] text-sm mt-1">Wishes Sent</div></div>
          <div><div className="text-4xl font-bold">41k</div><div className="text-[#64748B] text-sm mt-1">Active Users</div></div>
          <div><div className="text-4xl font-bold">92k</div><div className="text-[#64748B] text-sm mt-1">Events Tracked</div></div>
          <div><div className="text-4xl font-bold">99.8%</div><div className="text-[#64748B] text-sm mt-1">Delivery Rate</div></div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-[#64748B] uppercase tracking-[1.5px] text-xs mb-2">POWERFUL FEATURES</div>
          <h2 className="text-4xl font-bold tracking-tight">Everything you need to never<br />miss a special moment again</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div id="testimonials" className="max-w-7xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <div className="uppercase tracking-[2px] text-xs text-[#64748B]">LOVED BY USERS</div>
          <h3 className="text-3xl font-semibold mt-1">Real stories from real people</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, idx) => (
            <div key={idx} className="card p-6">
              <p className="italic text-[#CBD5E1]">“{t.quote}”</p>
              <div className="flex items-center gap-3 mt-5">
                <div className="w-9 h-9 bg-[#334155] rounded-full"></div>
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-[#64748B]">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="bg-[#1E293B] py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-sm text-[#64748B]">SIMPLE PRICING</div>
            <h3 className="text-4xl font-bold mt-1">Start for free. Upgrade when you need.</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`card p-7 relative ${plan.popular ? 'ring-1 ring-blue-500' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 right-6 px-4 py-0.5 text-xs bg-blue-500 rounded-full font-medium">Most Popular</div>
                )}
                <div>
                  <div className="font-semibold text-lg">{plan.name}</div>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    <span className="text-[#94A3B8] ml-1">/{plan.period}</span>
                  </div>
                </div>
                <ul className="mt-6 mb-7 space-y-2.5 text-sm">
                  {plan.features.map((f, i) => <li key={i} className="flex items-center gap-2">✓ {f}</li>)}
                </ul>
                <Link to="/register" className={`block text-center py-3 rounded-xl font-medium ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" className="max-w-4xl mx-auto px-6 py-20">
        <h3 className="text-center text-3xl font-semibold mb-10">Frequently Asked Questions</h3>
        
        <div className="space-y-4">
          {[
            ["Is the AI free to use?", "Yes, we use Google Gemini free tier. You get generous limits included."],
            ["Can I import contacts from CSV?", "Yes. Import and export contacts via CSV or Excel in one click."],
            ["How accurate is the scheduling?", "We use APScheduler and timezones. 99.8% delivery rate."],
            ["Do you support recurring events?", "Absolutely. Set yearly birthdays, anniversaries and custom recurrences."]
          ].map(([q, a], idx) => (
            <div key={idx} className="card p-5">
              <div className="font-medium mb-1">{q}</div>
              <div className="text-sm text-[#94A3B8]">{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact / CTA */}
      <div className="border-t border-[#334155]">
        <div className="max-w-4xl mx-auto px-6 py-14 text-center">
          <h2 className="text-4xl font-semibold">Ready to never miss another moment?</h2>
          <p className="text-[#94A3B8] mt-3">Join thousands automating heartfelt wishes.</p>
          <Link to="/register" className="inline-block mt-7 btn-primary px-10 py-3.5 text-base">Get Started for Free</Link>
          <div className="mt-6 text-xs text-[#64748B]">No credit card required • 14-day Pro trial</div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#334155] bg-[#0F172A] py-10 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-y-5 text-[#64748B]">
          <div>© 2026 AutoWish AI. All rights reserved.</div>
          <div className="flex gap-x-6">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
            <a href="#">Blog</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
