import React from 'react';
import { Save, FileText, Send, Download, Eye } from 'lucide-react';

interface BottomToolbarProps {
  onSaveDraft: () => void;
  onSaveTemplate: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onSend: () => void;
  isSaving: boolean;
}

export default function BottomToolbar({
  onSaveDraft,
  onSaveTemplate,
  onPreview,
  onDownload,
  onSend,
  isSaving,
}: BottomToolbarProps) {
  return (
    <div className="w-full bg-[#0D121F]/90 backdrop-blur-md border-t border-slate-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-20">
      {/* Left side actions: Save Draft, Template */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition-all"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        <button
          type="button"
          onClick={onSaveTemplate}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition-all"
        >
          <FileText size={14} />
          <span>Save Template</span>
        </button>
      </div>

      {/* Right side actions: Preview, Download, Send */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition-all"
        >
          <Eye size={14} />
          <span>Live Preview</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
        >
          <Download size={14} />
          <span>Download</span>
        </button>

        <button
          type="button"
          onClick={onSend}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-650/20 transition-all"
        >
          <Send size={14} />
          <span>Publish &amp; Send</span>
        </button>
      </div>
    </div>
  );
}
