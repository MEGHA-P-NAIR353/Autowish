import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  contactsAPI, eventsAPI, templatesAPI, scheduledAPI,
  logsAPI, dashboardAPI, aiAPI, notificationsAPI, analyticsAPI,
} from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

// ─── Fallback mock data (used when backend is offline / unauthenticated) ──────
const MOCK_CONTACTS = [
  { id: 1, name: 'Sarah Sarah', birthday: 'Nov 18, 2023', anniversary: null, email: 'sarah@gmail.com', phone: '+91 9876543210', relationship: 'Friend', group: 'General', notes: '' },
  { id: 2, name: 'Sarah Deen', birthday: 'Nov 18, 2023', anniversary: null, email: 'sarahdeen@gmail.com', phone: '+91 9876543211', relationship: 'Colleague', group: 'Work', notes: '' },
  { id: 3, name: 'Seran Deeny', birthday: 'Nov 18, 2023', anniversary: null, email: 'serandeen@gmail.com', phone: '+91 9876543212', relationship: 'Family', group: 'Family', notes: '' },
  { id: 4, name: 'John Deen', birthday: 'Jun 12, 2023', anniversary: null, email: 'john@gmail.com', phone: '+91 9876543213', relationship: 'Friend', group: 'General', notes: '' },
  { id: 5, name: 'Sarah Wilson', birthday: 'Nov 18, 2023', anniversary: 'Jan 15, 2022', email: 'sarahw@gmail.com', phone: '+91 9876543214', relationship: 'Family', group: 'Family', notes: '' },
  { id: 6, name: 'Saretta Asan', birthday: 'Nov 18, 2022', anniversary: null, email: 'saretta@gmail.com', phone: '+91 9876543215', relationship: 'Friend', group: 'General', notes: '' },
];

const MOCK_EVENTS = [
  { id: 1, title: "Sarah's Birthday", type: 'Birthday', date: '2026-11-18', recipient: 'Sarah Sarah', status: 'Upcoming' },
  { id: 2, title: 'Anniversary Event', type: 'Anniversary', date: '2026-11-22', recipient: 'Sarah Deen', status: 'Upcoming' },
  { id: 3, title: "John's Birthday", type: 'Birthday', date: '2026-11-25', recipient: 'John Deen', status: 'Upcoming' },
  { id: 4, title: 'Holiday Wishes', type: 'Holiday', date: '2026-12-25', recipient: 'Team', status: 'Upcoming' },
  { id: 5, title: "Saretta's Birthday", type: 'Birthday', date: '2026-11-19', recipient: 'Saretta Asan', status: 'Today' },
];

const MOCK_TEMPLATES = [
  { id: 1, name: 'Birthday - Friendly', occasion: 'Birthday', tone: 'Friendly', content: 'Happy Birthday {name}! May your day be filled with joy.', is_favorite: false },
  { id: 2, name: 'Anniversary - Romantic', occasion: 'Anniversary', tone: 'Romantic', content: 'Happy Anniversary {name}! Here\'s to many more years together.', is_favorite: true },
  { id: 3, name: 'Classic Birthday Card', occasion: 'Birthday', tone: 'Friendly', content: 'Wishing you a beautiful day filled with laughter, love, and your favorite treats! Happy Birthday!', is_favorite: true },
];

const MOCK_WISHES = [
  { id: 1, contact: { id: 1, name: 'Sarah Sarah', email: 'sarah@gmail.com' }, date: '2026-11-18', time: '09:00', occasion: 'Birthday', status: 'Scheduled', template: 'Birthday - Friendly' },
  { id: 2, contact: { id: 6, name: 'Saretta Asan', email: 'saretta@gmail.com' }, date: '2026-11-19', time: '10:30', occasion: 'Birthday', status: 'Scheduled', template: 'Birthday - Fun' },
];

const MOCK_LOGS = [
  { id: 1, recipient: 'sarah@gmail.com', subject: 'Birthday Wish', status: 'Delivered', date: 'Nov 18, 2025', delivery: 'Delivered' },
  { id: 2, recipient: 'sarahdeen@gmail.com', subject: 'Anniversary Wishes', status: 'Sent', date: 'Nov 07, 2025', delivery: 'Delivered' },
  { id: 3, recipient: 'john@gmail.com', subject: 'Birthday Wishes', status: 'Failed', date: 'Nov 05, 2025', delivery: 'Failed' },
];

const MOCK_STATS = {
  totalContacts: 1250,
  upcomingEvents: 15,
  wishesSent: 980,
  pendingReplies: 3,
  failedEmails: 12,
  totalScheduled: 24,
};

const MOCK_GREETING_ANALYTICS = {
  aiGreetings: { today: 0, week: 0, month: 0, total: 0 },
  greetingCards: { today: 0, week: 0, month: 0, total: 0 },
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [scheduledWishes, setScheduledWishes] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalContacts: 0,
    upcomingEvents: 0,
    wishesSent: 0,
    pendingReplies: 0,
    failedEmails: 0,
    totalScheduled: 0,
  });
  const [greetingAnalytics, setGreetingAnalytics] = useState({
    aiGreetings: { today: 0, week: 0, month: 0, total: 0 },
    greetingCards: { today: 0, week: 0, month: 0, total: 0 },
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState(null);

  // ── Fetch all data when authenticated ────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [
        contactsRes, eventsRes, templatesRes, scheduledRes,
        logsRes, statsRes, notifRes, analyticsRes, activityRes,
      ] = await Promise.allSettled([
        contactsAPI.getAll(),
        eventsAPI.getAll(),
        templatesAPI.getAll(),
        scheduledAPI.getAll(),
        logsAPI.getAll(),
        dashboardAPI.getStats(),
        notificationsAPI.getAll(),
        analyticsAPI.getGreetings(),
        dashboardAPI.getRecentActivity({ limit: 10 }),
      ]);

      if (contactsRes.status === 'fulfilled') {
        setContacts(contactsRes.value.data.results ?? contactsRes.value.data);
      }
      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.data.results ?? eventsRes.value.data);
      }
      if (templatesRes.status === 'fulfilled') {
        setTemplates(templatesRes.value.data.results ?? templatesRes.value.data);
      }
      if (scheduledRes.status === 'fulfilled') {
        setScheduledWishes(scheduledRes.value.data.results ?? scheduledRes.value.data);
      }
      if (logsRes.status === 'fulfilled') {
        setEmailLogs(logsRes.value.data.results ?? logsRes.value.data);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
      if (notifRes.status === 'fulfilled') {
        setNotifications(notifRes.value.data.results ?? notifRes.value.data);
      }
      if (analyticsRes.status === 'fulfilled') {
        setGreetingAnalytics(analyticsRes.value.data);
      }
      if (activityRes.status === 'fulfilled') {
        setRecentActivities(activityRes.value.data.results ?? []);
      }
    } catch (err) {
      console.warn('DataContext fetchAll error (falling back to mock):', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ── Refetch greeting analytics only (used after sending) ────────────────
  const refetchGreetingAnalytics = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await analyticsAPI.getGreetings();
      setGreetingAnalytics(res.data);
    } catch (err) {
      console.warn('refetchGreetingAnalytics error:', err.message);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Poll for new activities every 30 seconds while authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchRecentActivity();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchRecentActivity]);

  // ── Contacts CRUD ─────────────────────────────────────────────────────────
  const addContact = async (contact) => {
    try {
      const resp = await contactsAPI.create(contact);
      const newContact = resp.data;
      setContacts((prev) => [newContact, ...prev]);
      return newContact;
    } catch {
      const newContact = { ...contact, id: Date.now() };
      setContacts((prev) => [newContact, ...prev]);
      return newContact;
    }
  };

  const updateContact = async (id, updatedContact) => {
    try {
      const resp = await contactsAPI.update(id, updatedContact);
      setContacts((prev) => prev.map((c) => (c.id === id ? resp.data : c)));
    } catch {
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updatedContact } : c)));
    }
  };

  const deleteContact = async (id) => {
    try {
      await contactsAPI.delete(id);
    } catch { /* silently proceed */ }
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // ── Events CRUD ───────────────────────────────────────────────────────────
  const addEvent = async (event) => {
    try {
      const resp = await eventsAPI.create(event);
      const newEvent = resp.data;
      setEvents((prev) => [newEvent, ...prev]);
      return newEvent;
    } catch {
      const newEvent = { ...event, id: Date.now() };
      setEvents((prev) => [newEvent, ...prev]);
      return newEvent;
    }
  };

  const updateEvent = async (id, updatedEvent) => {
    try {
      const resp = await eventsAPI.update(id, updatedEvent);
      setEvents((prev) => prev.map((e) => (e.id === id ? resp.data : e)));
    } catch {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updatedEvent } : e)));
    }
  };

  const deleteEvent = async (id) => {
    try {
      await eventsAPI.delete(id);
    } catch { /* silently proceed */ }
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // ── Scheduled Wishes CRUD ────────────────────────────────────────────────
  const addScheduledWish = async (wish) => {
    try {
      const resp = await scheduledAPI.create(wish);
      const newWish = resp.data;
      setScheduledWishes((prev) => [newWish, ...prev]);
      return newWish;
    } catch {
      const newWish = { ...wish, id: Date.now() };
      setScheduledWishes((prev) => [newWish, ...prev]);
      return newWish;
    }
  };

  const deleteScheduledWish = async (id) => {
    try {
      await scheduledAPI.delete(id);
    } catch { /* silently proceed */ }
    setScheduledWishes((prev) => prev.filter((w) => w.id !== id));
  };

  // ── Templates CRUD ────────────────────────────────────────────────────────
  const addTemplate = async (template) => {
    try {
      const resp = await templatesAPI.create(template);
      const newTemplate = resp.data;
      setTemplates((prev) => [newTemplate, ...prev]);
      return newTemplate;
    } catch {
      const newTemplate = { ...template, id: Date.now() };
      setTemplates((prev) => [newTemplate, ...prev]);
      return newTemplate;
    }
  };

  const updateTemplate = async (id, updated) => {
    try {
      const resp = await templatesAPI.update(id, updated);
      setTemplates((prev) => prev.map((t) => (t.id === id ? resp.data : t)));
    } catch {
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    }
  };

  const deleteTemplate = async (id) => {
    try {
      await templatesAPI.delete(id);
    } catch { /* silently proceed */ }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Email Log helper ──────────────────────────────────────────────────────
  const addEmailLog = (log) => {
    setEmailLogs((prev) => [log, ...prev]);
  };

  // ── AI Greeting ───────────────────────────────────────────────────────────
  const generateAIGreeting = async (recipient, occasion, tone, language = 'en') => {
    try {
      const resp = await aiAPI.generateGreeting({ recipient, occasion, tone, language });
      return resp.data.greeting || resp.data.message;
    } catch {
      // Offline fallback
      const fallbacks = {
        Birthday: {
          Funny: `Happy Birthday ${recipient}! Hope your day is filled with cake and zero adulting! 🎂`,
          Friendly: `Happy Birthday ${recipient}! Wishing you an amazing year ahead full of laughter and joy. 🎉`,
          Formal: `Dear ${recipient}, I wish you a very happy birthday and continued success in all your endeavors.`,
          Warm: `Warmest birthday wishes to you, ${recipient}! May this special day bring you all the joy you deserve.`,
        },
        Anniversary: {
          Romantic: `Happy Anniversary ${recipient}! Every year with you feels like a new beginning. ❤️`,
          Friendly: `Happy Anniversary! Wishing you both a lifetime of love and happiness.`,
          Formal: `Congratulations on your anniversary, ${recipient}. May your bond continue to grow stronger.`,
        },
      };
      const defaultText = `Dear ${recipient}, wishing you a wonderful ${occasion.toLowerCase()}. — AutoWish AI`;
      return fallbacks[occasion]?.[tone] || defaultText;
    }
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setNotificationsLoading(true);
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data.results ?? res.data);
    } catch (err) {
      console.warn('Notification fetch error:', err.message);
    } finally {
      setNotificationsLoading(false);
    }
  }, [isAuthenticated]);

  const markNotificationRead = async (id) => {
    const previousNotifications = [...notifications];
    // Optimistic update
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    
    try {
      await notificationsAPI.markRead(id);
    } catch (err) {
      // Rollback
      setNotifications(previousNotifications);
      console.error('Failed to mark notification as read:', err);
      throw err;
    }
  };

  const markAllNotificationsRead = async () => {
    const previousNotifications = [...notifications];
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    
    try {
      await notificationsAPI.markAllRead();
    } catch (err) {
      // Rollback
      setNotifications(previousNotifications);
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  };

  const deleteNotification = async (id) => {
    const previousNotifications = [...notifications];
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    
    try {
      await notificationsAPI.delete(id);
    } catch (err) {
      // Rollback
      setNotifications(previousNotifications);
      console.error('Failed to delete notification:', err);
      throw err;
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.is_read).length;

  const fetchRecentActivity = useCallback(async () => {
    if (!isAuthenticated) return;
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await dashboardAPI.getRecentActivity({ limit: 10 });
      setRecentActivities(res.data.results ?? []);
    } catch (err) {
      console.warn('fetchRecentActivity error:', err.message);
      setActivitiesError(err.message || 'Failed to load recent activity');
    } finally {
      setActivitiesLoading(false);
    }
  }, [isAuthenticated]);

  const value = {
    // State
    contacts, events, templates, scheduledWishes, emailLogs, notifications, stats,
    greetingAnalytics, recentActivities, loading, notificationsLoading, activitiesLoading,
    activitiesError, unreadNotificationCount,

    // Contact actions
    addContact, updateContact, deleteContact,

    // Event actions
    addEvent, updateEvent, deleteEvent,

    // Scheduled wish actions
    addScheduledWish, deleteScheduledWish,

    // Template actions
    addTemplate, updateTemplate, deleteTemplate,

    // Log helpers
    addEmailLog,

    // AI
    generateAIGreeting,

    // Notifications
    notifications,
    markNotificationRead, markAllNotificationsRead, deleteNotification, fetchNotifications,

    // Reload
    fetchAll,
    refetchGreetingAnalytics,
    fetchRecentActivity,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
