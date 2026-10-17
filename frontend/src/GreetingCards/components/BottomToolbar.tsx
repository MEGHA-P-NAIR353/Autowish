import React from 'react';
import { Save, FileText, Send, Download, Eye } from 'lucide-react';

interface BottomToolbarProps {
  onSaveDraft: () => void;
  onSaveTemplate: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onSend: () => void;
  isSaving: boolean;
  isOverflowed?: boolean;
}

export default function BottomToolbar({
  onSaveDraft,
  onSaveTemplate,
  onPreview,
  onDownload,
  onSend,
  isSaving,
  isOverflowed = false,
}: BottomToolbarProps) {
  return (
    <div className="w-full bg-inset/90 backdrop-blur-md border-t border-line px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-20">
      {/* Left side actions: Save Draft, Template */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-raised disabled:opacity-50 text-black dark:text-muted hover:text-black dark:hover:text-fg rounded-xl text-xs font-bold border border-line transition-all shadow-sm"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        <button
          type="button"
          onClick={onSaveTemplate}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-raised disabled:opacity-50 text-black dark:text-muted hover:text-black dark:hover:text-fg rounded-xl text-xs font-bold border border-line transition-all shadow-sm"
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
          className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-raised text-black dark:text-muted hover:text-black dark:hover:text-fg rounded-xl text-xs font-bold border border-line transition-all shadow-sm"
        >
          <Eye size={14} />
          <span>Live Preview</span>
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={isOverflowed}
          title={isOverflowed ? 'Cannot download: message exceeds card bounds' : undefined}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-700 dark:text-indigo-400 hover:text-white rounded-xl text-xs font-bold transition-all"
        >
          <Download size={14} />
          <span>Download</span>
        </button>

        <button
          type="button"
          onClick={onSend}
          disabled={isOverflowed || isSaving}
          title={isOverflowed ? 'Cannot send: message exceeds card bounds' : undefined}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send size={14} />
              <span>Publish &amp; Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
