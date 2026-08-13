import React, { useState } from 'react';
import { X, Image, FileText, Download, Check } from 'lucide-react';
import { cardsAPI } from '../../../services/greetingCardsAPI';
import toast from 'react-hot-toast';

export default function ExportModal({ canvasRef, card, cardId, onClose }) {
  const [format, setFormat] = useState('png');
  const [resolution, setResolution] = useState('high'); // high (2x) | normal (1x)
  const [transparent, setTransparent] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleDownload = async () => {
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const scale = resolution === 'high' ? 2 : 1;

      // Temporary changes to DOM if transparent is selected
      const originalBg = canvasRef.current.style.background;
      if (transparent && format === 'png') {
        canvasRef.current.style.background = 'transparent';
      }

      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        scale: scale,
        backgroundColor: transparent && format === 'png' ? null : card.backgroundColor,
      });

      // Restore background
      canvasRef.current.style.background = originalBg;

      if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf');
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
          orientation: card.cardWidth > card.cardHeight ? 'l' : 'p',
          unit: 'px',
          format: [card.cardWidth, card.cardHeight],
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, card.cardWidth, card.cardHeight);
        pdf.save(`${card.title || 'greeting-card'}.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `${card.title || 'greeting-card'}.${format}`;
        link.href = canvas.toDataURL(`image/${format === 'png' ? 'png' : 'jpeg'}`, 1.0);
        link.click();
      }

      toast.success('Card exported!');
      onClose();
    } catch (err) {
      toast.error('Client-side export failed, calling server backup...');
      // Backup server-side download
      if (cardId) {
        try {
          const res = await cardsAPI.exportCard(cardId, format);
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${card.title || 'card'}.${format}`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          onClose();
        } catch {
          toast.error('Server export failed too.');
        }
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e293b] border border-slate-700/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <h3 className="text-white font-bold text-sm">Export Greeting Card</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Format selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {['png', 'jpeg', 'pdf'].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`py-2 rounded-xl text-xs font-semibold uppercase transition-all border ${
                    format === fmt
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Transparent PNG toggle */}
          {format === 'png' && (
            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-200">Transparent PNG</div>
                <div className="text-[10px] text-slate-500">Remove card background fill</div>
              </div>
              <button
                onClick={() => setTransparent(!transparent)}
                className={`w-10 h-5 rounded-full transition-all relative ${transparent ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${transparent ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          )}

          {/* Resolution select */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Quality / Resolution</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'normal', label: 'Standard (1x)' },
                { value: 'high', label: 'High Res (2x)' },
              ].map(res => (
                <button
                  key={res.value}
                  onClick={() => setResolution(res.value)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                    resolution === res.value
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 border-t border-slate-700/30 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
          >
            {exporting ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download size={14} />}
            Download Card
          </button>
        </div>
      </div>
    </div>
  );
}
