import React, { useReducer, useRef, useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { cardsAPI } from '../../../services/greetingCardsAPI';
import { contactsAPI } from '../../../services/contactsAPI';
import TopToolbar from './TopToolbar';
import LeftSidebar from './LeftSidebar';
import CardCanvas from './CardCanvas';
import RightSidebar from './RightSidebar';
import LayerPanel from './LayerPanel';
import ExportModal from './ExportModal';

// ─── Card Size Presets ────────────────────────────────────────────────────────
export const CARD_SIZES = {
  instagram_square: { w: 500, h: 500, label: 'Instagram Square' },
  portrait:         { w: 500, h: 625, label: 'Portrait' },
  landscape:        { w: 700, h: 394, label: 'Landscape' },
  story:            { w: 500, h: 889, label: 'Story' },
  email_banner:     { w: 700, h: 233, label: 'Email Banner' },
  a5:               { w: 500, h: 707, label: 'A5' },
  custom:           { w: 500, h: 500, label: 'Custom' },
};

// ─── Element Factory ──────────────────────────────────────────────────────────
let elemCounter = 0;
export function makeElement(type, overrides = {}) {
  const id = `el_${Date.now()}_${++elemCounter}`;
  const base = {
    id, type,
    x: 80, y: 80,
    width: 200, height: 50,
    rotation: 0, opacity: 1,
    locked: false, visible: true,
    zIndex: elemCounter,
  };
  const defaults = {
    text: {
      content: 'Double-click to edit',
      fontFamily: 'Inter', fontSize: 20,
      fontWeight: 'normal', fontStyle: 'normal',
      textDecoration: 'none', textAlign: 'center',
      color: '#ffffff', letterSpacing: 0, lineHeight: 1.4,
      shadow: false, stroke: false, strokeColor: '#000000',
      gradient: false, gradientFrom: '#ffffff', gradientTo: '#a78bfa',
      width: 220, height: 40,
    },
    emoji: {
      content: '🎂', fontSize: 48,
      width: 70, height: 70,
    },
    shape: {
      shape: 'rectangle',
      fill: '#7c3aed', stroke: true, strokeColor: '#a78bfa',
      borderRadius: 8,
      width: 160, height: 80,
    },
    image: {
      src: null, borderRadius: 0,
      shadow: false, filter: 'none',
      brightness: 100, contrast: 100, saturation: 100,
      width: 180, height: 180,
    },
    sticker: {
      content: '🎉', fontSize: 64,
      width: 80, height: 80,
    },
  };
  return { ...base, ...(defaults[type] || {}), ...overrides };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
const MAX_HISTORY = 50;

function cloneElements(els) {
  return els.map(e => ({ ...e }));
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': return { ...state, ...action.payload, history: [action.payload.elements], historyIndex: 0 };

    case 'SET_CARD_PROP': {
      const next = { ...state, [action.key]: action.value };
      return next;
    }

    case 'ADD_ELEMENT': {
      const next = [...state.elements, action.element];
      return pushHistory(state, next, { selectedId: action.element.id });
    }

    case 'UPDATE_ELEMENT': {
      const next = state.elements.map(e => e.id === action.id ? { ...e, ...action.changes } : e);
      return action.noHistory
        ? { ...state, elements: next }
        : pushHistory(state, next, {});
    }

    case 'DELETE_ELEMENT': {
      const next = state.elements.filter(e => e.id !== action.id);
      return pushHistory(state, next, { selectedId: null });
    }

    case 'DUPLICATE_ELEMENT': {
      const el = state.elements.find(e => e.id === action.id);
      if (!el) return state;
      const dup = { ...el, id: `el_${Date.now()}`, x: el.x + 20, y: el.y + 20 };
      const next = [...state.elements, dup];
      return pushHistory(state, next, { selectedId: dup.id });
    }

    case 'REORDER': {
      const next = action.elements;
      return pushHistory(state, next, {});
    }

    case 'SELECT': return { ...state, selectedId: action.id };

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return { ...state, elements: cloneElements(state.history[idx]), historyIndex: idx, selectedId: null };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return { ...state, elements: cloneElements(state.history[idx]), historyIndex: idx };
    }

    default: return state;
  }
}

function pushHistory(state, nextElements, extra) {
  const sliced = state.history.slice(0, state.historyIndex + 1);
  const history = [...sliced, cloneElements(nextElements)].slice(-MAX_HISTORY);
  return { ...state, elements: nextElements, history, historyIndex: history.length - 1, ...extra };
}

const INITIAL_STATE = {
  // Card meta
  title: 'Untitled Card',
  occasion: 'Birthday',
  recipientName: '',
  selectedContactId: null,
  cardSize: 'instagram_square',
  cardTheme: 'dark',
  cardWidth: 500,
  cardHeight: 500,
  backgroundColor: '#1a1a2e',
  backgroundImage: null,
  backgroundBlur: 0,
  backgroundOpacity: 1,
  borderRadius: 16,
  shadow: true,
  // Elements
  elements: [],
  selectedId: null,
  // History
  history: [[]],
  historyIndex: 0,
};

// ─── CardEditor ───────────────────────────────────────────────────────────────
export default function CardEditor({ cardId: propCardId }) {
  const { id: routeId } = useParams();
  const cardId = propCardId || routeId;
  const { refetchGreetingAnalytics } = useData();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showLayers, setShowLayers] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const canvasRef = useRef(null);
  const autosaveRef = useRef(null);
  const dbCardIdRef = useRef(cardId || null);

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const res = await contactsAPI.getAll();
        setContacts(res.data.results || res.data);
      } catch (err) {
        toast.error('Failed to load contacts');
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, []);

  // Handle selecting a contact
  const handleSelectContact = useCallback((contact) => {
    if (contact) {
      dispatch({ type: 'SET_CARD_PROP', key: 'selectedContactId', value: contact.id });
      dispatch({ type: 'SET_CARD_PROP', key: 'recipientName', value: contact.name });
    } else {
      dispatch({ type: 'SET_CARD_PROP', key: 'selectedContactId', value: null });
      dispatch({ type: 'SET_CARD_PROP', key: 'recipientName', value: '' });
    }
  }, []);

  // Load existing card or initialize blank card with default elements
  useEffect(() => {
    if (cardId) {
      cardsAPI.get(cardId).then(res => {
        const d = res.data;
        dispatch({
          type: 'LOAD',
          payload: {
            title: d.title,
            occasion: d.occasion,
            recipientName: d.recipientName,
            selectedContactId: d.contactInfo?.id || null,
            cardSize: d.cardSize,
            cardTheme: d.cardTheme,
            cardWidth: d.cardWidth,
            cardHeight: d.cardHeight,
            backgroundColor: d.backgroundColor,
            backgroundImage: d.backgroundImageUrl || null,
            backgroundBlur: d.backgroundBlur,
            backgroundOpacity: d.backgroundOpacity,
            borderRadius: d.borderRadius,
            shadow: d.shadow,
            elements: d.elementsJson || [],
          }
        });
        dbCardIdRef.current = d.id;
      }).catch(() => toast.error('Failed to load card'));
    } else {
      // Initialize blank card with quick default elements
      dispatch({
        type: 'LOAD',
        payload: {
          title: 'My Custom Greeting Card',
          occasion: 'Birthday',
          recipientName: 'Friend',
          selectedContactId: null,
          cardSize: 'instagram_square',
          cardTheme: 'dark',
          cardWidth: 500,
          cardHeight: 500,
          backgroundColor: '#1a1a2e',
          backgroundImage: null,
          backgroundBlur: 0,
          backgroundOpacity: 1,
          borderRadius: 16,
          shadow: true,
          elements: [
            makeElement('text', { id: 'default_head', content: 'HAPPY BIRTHDAY!', fontSize: 32, fontWeight: 'bold', x: 50, y: 80, width: 400, height: 50, color: '#ffffff' }),
            makeElement('text', { id: 'default_msg', content: 'Double-click to write a custom message or use the AI tab to generate one.', fontSize: 16, x: 50, y: 160, width: 400, height: 100, color: '#a78bfa' }),
            makeElement('emoji', { id: 'default_emoji', content: '🎉', fontSize: 64, x: 210, y: 280, width: 80, height: 80 }),
            makeElement('text', { id: 'default_sig', content: 'Best Wishes, [Your Name]', fontSize: 14, fontStyle: 'italic', x: 50, y: 390, width: 400, height: 40, color: '#9ca3af' }),
          ]
        }
      });
      dbCardIdRef.current = null;
    }
  }, [cardId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }); }
        if (e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }); }
        if (e.key === 's') { e.preventDefault(); handleSave('draft'); }
        if (e.key === 'd') { e.preventDefault(); if (state.selectedId) dispatch({ type: 'DUPLICATE_ELEMENT', id: state.selectedId }); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) dispatch({ type: 'DELETE_ELEMENT', id: state.selectedId });
      }
      if (e.key === 'Escape') dispatch({ type: 'SELECT', id: null });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.selectedId]);

  // Autosave every 30 seconds
  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      if (dbCardIdRef.current) handleSave('draft', true);
    }, 30000);
    return () => clearInterval(autosaveRef.current);
  }, [state]);

  // ── Serialize state to form data ─────────────────────────────────────────
  const buildFormData = useCallback((status) => {
    const size = CARD_SIZES[state.cardSize] || CARD_SIZES.instagram_square;
    const fd = new FormData();
    fd.append('title', state.title);
    fd.append('occasion', state.occasion);
    fd.append('recipient_name', state.recipientName);
    fd.append('card_size', state.cardSize);
    fd.append('card_theme', state.cardTheme);
    fd.append('card_width', state.cardWidth || size.w);
    fd.append('card_height', state.cardHeight || size.h);
    fd.append('background_color', state.backgroundColor);
    fd.append('background_blur', state.backgroundBlur);
    fd.append('background_opacity', state.backgroundOpacity);
    fd.append('border_radius', state.borderRadius);
    fd.append('shadow', state.shadow);
    fd.append('elements_json', JSON.stringify(state.elements));
    fd.append('status', status);
    return fd;
  }, [state]);

  // ─── Send Card ──────────────────────────────────────────────────────────────────
  const handleSendCard = useCallback(async () => {
    if (!state.selectedContactId) {
      toast.error('Please select a recipient first');
      return;
    }

    const selectedContact = contacts.find(c => c.id === state.selectedContactId);
    if (!selectedContact?.email) {
      toast.error('Selected contact has no email');
      return;
    }

    setSaving(true);
    try {
      // First save draft if needed
      const fd = buildFormData('draft');
      if (!dbCardIdRef.current) {
        const res = await cardsAPI.create(fd);
        dbCardIdRef.current = res.data.id;
        navigate(`/greeting-cards/create/${res.data.id}`, { replace: true });
      } else {
        await cardsAPI.update(dbCardIdRef.current, fd);
      }

      // Save preview
      if (canvasRef.current) {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(canvasRef.current, { useCORS: true, scale: 1 });
        const base64 = canvas.toDataURL('image/png');
        await cardsAPI.savePreview(dbCardIdRef.current, base64);
      }

      // Send card
      await cardsAPI.sendCard(dbCardIdRef.current, state.selectedContactId);
      // Refresh dashboard analytics without page reload
      if (refetchGreetingAnalytics) refetchGreetingAnalytics();
      toast.success('🎉 Greeting card sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send greeting card');
    } finally {
      setSaving(false);
    }
  }, [state.selectedContactId, contacts, buildFormData, navigate]);

  // ─── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (status = 'draft', silent = false) => {
    setSaving(true);
    try {
      const fd = buildFormData(status);
      let res;
      if (dbCardIdRef.current) {
        res = await cardsAPI.update(dbCardIdRef.current, fd);
      } else {
        res = await cardsAPI.create(fd);
        dbCardIdRef.current = res.data.id;
        navigate(`/greeting-cards/create/${res.data.id}`, { replace: true });
      }

      // Save preview snapshot
      if (canvasRef.current) {
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(canvasRef.current, { useCORS: true, scale: 1 });
          const base64 = canvas.toDataURL('image/png');
          await cardsAPI.savePreview(dbCardIdRef.current, base64);
        } catch { /* preview save is non-critical */ }
      }

      if (!silent) toast.success(status === 'published' ? '✅ Card published!' : '💾 Draft saved');
    } catch (err) {
      if (!silent) toast.error('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [buildFormData, navigate]);

  const selectedElement = state.elements.find(e => e.id === state.selectedId) || null;

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e] overflow-hidden">
      {/* Top Toolbar */}
      <TopToolbar
        state={state}
        dispatch={dispatch}
        saving={saving}
        zoom={zoom}
        setZoom={setZoom}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        showLayers={showLayers}
        setShowLayers={setShowLayers}
        onSave={handleSave}
        onSend={handleSendCard}
        onExport={() => setShowExport(true)}
        navigate={navigate}
      />

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar dispatch={dispatch} state={state} />

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-[#0d1117]">
          <CardCanvas
            state={state}
            dispatch={dispatch}
            zoom={zoom}
            setZoom={setZoom}
            canvasRef={canvasRef}
            previewMode={previewMode}
          />
        </div>

        {/* Layer Panel (overlay) */}
        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ x: 280 }} animate={{ x: 0 }} exit={{ x: 280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-64 border-l border-slate-700/50 flex-shrink-0"
            >
              <LayerPanel state={state} dispatch={dispatch} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Sidebar */}
        <RightSidebar
          state={state}
          dispatch={dispatch}
          selectedElement={selectedElement}
          contacts={contacts}
          loadingContacts={loadingContacts}
          onSelectContact={handleSelectContact}
        />
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <ExportModal
            canvasRef={canvasRef}
            card={state}
            cardId={dbCardIdRef.current}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
