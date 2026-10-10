import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import AmbientBackground from './ui/AmbientBackground';
import ErrorBoundary from './common/ErrorBoundary';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const closeBtnRef = useRef(null);
  const menuBtnRef = useRef(null);
  const wasOpen = useRef(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Mobile drawer: Esc to close, focus management, scroll lock
  useEffect(() => {
    if (sidebarOpen) {
      wasOpen.current = true;
      const onKey = (e) => { if (e.key === 'Escape') closeSidebar(); };
      document.addEventListener('keydown', onKey);
      const t = setTimeout(() => closeBtnRef.current?.focus(), 60);
      return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      menuBtnRef.current?.focus?.();
    }
    return undefined;
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="relative h-screen flex overflow-hidden">
      <AmbientBackground />

      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen relative z-20">
        <Sidebar />
      </div>

      {/* Mobile Sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-50 glass-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeSidebar}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="h-full w-64 max-w-[85vw]"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'tween', duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar mobile onNavigate={closeSidebar} />
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeSidebar}
                aria-label="Close navigation menu"
                className="absolute top-4 left-[calc(min(16rem,85vw)+12px)] btn-secondary btn-icon !rounded-full"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopNavbar onMenuClick={() => setSidebarOpen((o) => !o)} menuOpen={sidebarOpen} menuButtonRef={menuBtnRef} />

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden outline-none">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[1600px] mx-auto"
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
