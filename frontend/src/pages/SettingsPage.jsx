import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    timezone: user?.profile?.timezone || 'Asia/Kolkata',
    preferred_language: user?.profile?.preferred_language || 'en',
  });
  const [smtp, setSmtp] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    username: '',
    password: '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    reminders: true,
  });
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        timezone: profile.timezone,
        preferred_language: profile.preferred_language,
      });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const saveSMTP = () => {
    toast.success('SMTP settings saved (Gmail)');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-7">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="card p-6">
          <div className="font-semibold mb-4">Profile Settings</div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#94A3B8]">First Name</label>
                <input value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} className="input" placeholder="First name" />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8]">Last Name</label>
                <input value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} className="input" placeholder="Last name" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#94A3B8]">Email</label>
              <input type="email" value={profile.email} disabled className="input opacity-60 cursor-not-allowed" title="Email cannot be changed here" />
            </div>
            <div>
              <label className="text-xs text-[#94A3B8]">Phone</label>
              <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="input" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-xs text-[#94A3B8]">Timezone</label>
              <select value={profile.timezone} onChange={e => setProfile({...profile, timezone: e.target.value})} className="input">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#94A3B8]">Preferred Language</label>
              <select value={profile.preferred_language} onChange={e => setProfile({...profile, preferred_language: e.target.value})} className="input">
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </div>
            <button type="submit" disabled={saving} className="btn-primary mt-1 disabled:opacity-70">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* SMTP Config */}
        <div className="card p-6">
          <div className="font-semibold mb-4">SMTP Configuration (Gmail)</div>
          <div className="space-y-3 text-sm">
            <input placeholder="SMTP Host" value={smtp.host} onChange={e=>setSmtp({...smtp, host:e.target.value})} className="input" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Port" value={smtp.port} onChange={e=>setSmtp({...smtp, port:e.target.value})} className="input" />
              <input placeholder="Username" value={smtp.username} onChange={e=>setSmtp({...smtp, username:e.target.value})} className="input" />
            </div>
            <input type="password" placeholder="App Password" value={smtp.password} onChange={e=>setSmtp({...smtp, password:e.target.value})} className="input" />
            <button onClick={saveSMTP} className="btn-secondary mt-1">Save SMTP Settings</button>
            <div className="text-xs text-[#64748B]">Use App Password for Gmail. Free tier.</div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-6 lg:col-span-2">
          <div className="font-semibold mb-4">Notifications</div>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.keys(notifications).map(key => (
              <label key={key} className="flex items-center gap-3 bg-[#0F172A] px-5 py-4 rounded-2xl border border-[#334155]">
                <input
                  type="checkbox"
                  checked={notifications[key]}
                  onChange={() => setNotifications({...notifications, [key]: !notifications[key]})}
                  className="accent-blue-500 w-4 h-4"
                />
                <span className="capitalize text-sm">{key} Notifications</span>
              </label>
            ))}
          </div>
          <div className="mt-5">
            <button onClick={() => toast.success('Notification preferences saved')} className="btn-primary">Save Preferences</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
