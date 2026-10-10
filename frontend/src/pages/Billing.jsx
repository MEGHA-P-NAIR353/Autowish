import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, FileText, Calendar, ArrowUpRight, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatInrPrice } from '../utils/pricing';

const PLAN_NAMES = {
  FREE: 'Free Plan',
  PRO: 'Pro Plan',
  BUSINESS: 'Business Plan',
  ENTERPRISE: 'Enterprise Plan',
};

const STATUS_LABELS = {
  SUCCESS: { label: 'Successful', className: 'text-emerald-400' },
  FAILED: { label: 'Failed', className: 'text-red-400' },
  PENDING: { label: 'Pending', className: 'text-amber-400' },
  CANCELLED: { label: 'Cancelled', className: 'text-slate-400' },
};

const Billing = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentPlan = user?.profile?.subscription_plan || 'FREE';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('payments/');
        setHistory(res.data.payments || []);
      } catch {
        toast.error('Failed to load payment history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const downloadReceipt = async (item) => {
    const toastId = toast.loading('Generating payment receipt...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

      const dateStr = new Date(item.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      // Background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 148, 210, 'F');

      // Top banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 148, 32, 'F');

      // Top brand accent
      doc.setFillColor(99, 102, 241); // indigo-500
      doc.rect(0, 0, 148, 2.5, 'F');

      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('AUTOWISH INVOICE & RECEIPT', 12, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Automated AI Greetings & Scheduled Delivery', 12, 20);
      doc.text(`Invoice ID: ${item.transaction_id || `TXN-${item.payment_id}`}`, 12, 26);

      // Receipt Card Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(12, 38, 124, 150, 3, 3, 'FD');

      // Customer and Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Payment Confirmation', 18, 48);

      // Status Badge
      const isSuccess = item.status === 'SUCCESS' || item.status === 'COMPLETED';
      doc.setFillColor(isSuccess ? 220 : 254, isSuccess ? 252 : 242, isSuccess ? 231 : 242);
      doc.roundedRect(95, 42, 35, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(isSuccess ? 22 : 153, isSuccess ? 101 : 27, isSuccess ? 52 : 27);
      doc.text(isSuccess ? 'PAID' : (item.status || 'PENDING'), 102, 47.5);

      // Info rows
      let y = 60;
      const details = [
        ['Customer Account:', user?.email || user?.username || 'Valued Customer'],
        ['Payment Date:', dateStr],
        ['Transaction ID:', item.transaction_id || `TXN-${item.payment_id}`],
        ['Plan Purchased:', item.plan_name || item.plan || 'Subscription Plan'],
        ['Payment Method:', item.payment_method || 'Online Payment (Sandbox)'],
      ];

      doc.setFontSize(8);
      details.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(lbl, 18, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(String(val), 60, y);
        y += 8;
      });

      // Divider line
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(18, y, 130, y);

      // Pricing Breakdown
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Item Description', 18, y);
      doc.text('Amount', 105, y);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(item.plan_name || item.plan || 'Autowish Plan', 18, y);
      doc.text(`${formatInrPrice(item.amount)} ${item.currency || 'INR'}`, 105, y);

      y += 6;
      doc.setTextColor(100, 116, 139);
      doc.text('Taxes & Surcharges (Included):', 18, y);
      doc.text('₹0.00', 105, y);

      // Total Box
      y += 10;
      doc.setFillColor(248, 250, 252);
      doc.rect(18, y, 112, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Total Paid:', 22, y + 8);
      doc.text(`${formatInrPrice(item.amount)} ${item.currency || 'INR'}`, 95, y + 8);

      // Footer note inside container
      y += 24;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Thank you for choosing AutoWish! Electronic transaction receipt.', 18, y);
      doc.text('For billing questions, contact support@autowish.app', 18, y + 5);

      doc.save(`receipt-${item.transaction_id || item.payment_id}.pdf`);
      toast.dismiss(toastId);
      toast.success('Receipt downloaded successfully!');
    } catch (err) {
      console.error('Receipt generation error:', err);
      toast.dismiss(toastId);
      toast.error('Failed to download receipt.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
        <p className="text-slate-400 text-sm">Manage payment history, subscription status, and download receipts.</p>
      </div>

      {/* Subscription Card */}
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/15 border border-line-soft p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-extrabold uppercase rounded-full">
            Active Plan
          </span>
          <h2 className="text-2xl font-black">{PLAN_NAMES[currentPlan] || currentPlan}</h2>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Calendar size={13} /> Sandbox billing — demo payments only
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/subscription"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl transition-all shadow-lg text-white"
          >
            Upgrade Plan
          </Link>
          <button
            onClick={() => toast('Subscription cancellation requested. Contact support for assistance.')}
            className="px-4 py-2 bg-raised hover:bg-raised-hover text-xs font-semibold rounded-xl border border-line transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Cards & Invoices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Method */}
        <div className="md:col-span-1 bg-surface border border-line-soft p-5 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-200">
            <CreditCard size={16} className="text-blue-500" /> Payment Methods
          </h3>
          <div className="bg-inset border border-line-soft p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden">
            <div className="w-10 h-7 bg-raised border border-line/60 rounded flex items-center justify-center font-bold text-[10px] tracking-widest text-slate-400">
              DEMO
            </div>
            <div>
              <p className="text-xs font-bold">Sandbox Test Mode</p>
              <p className="text-[10px] text-slate-500 mt-0.5">No real cards stored</p>
            </div>
            <span className="absolute top-2 right-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase">
              Test
            </span>
          </div>
        </div>

        {/* Payment History */}
        <div className="md:col-span-2 bg-surface border border-line-soft p-5 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-200">
            <FileText size={16} className="text-blue-500" /> Payment History
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No payment history yet.</p>
          ) : (
            <div className="border border-line-soft/80 rounded-2xl divide-y divide-line-soft/60 overflow-hidden">
              {history.map(item => {
                const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.PENDING;
                const date = new Date(item.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                });
                return (
                  <div key={item.payment_id} className="p-3.5 bg-inset/40 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{item.plan_name || item.plan}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mt-1">
                        <span>{date}</span>
                        <span>•</span>
                        <span>{item.transaction_id}</span>
                        <span>•</span>
                        <span className={statusInfo.className}>{statusInfo.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-200">
                        {formatInrPrice(item.amount)} {item.currency}
                      </span>
                      <button
                        onClick={() => downloadReceipt(item)}
                        title="Download PDF Receipt"
                        aria-label="Download PDF Receipt"
                        className="p-1.5 bg-raised hover:bg-raised-hover rounded-lg border border-line/40 text-slate-400 hover:text-fg transition-all"
                      >
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
