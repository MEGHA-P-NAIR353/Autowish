import React, { useState, useEffect, useCallback } from 'react';
import { reportsAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  Download, BarChart3, TrendingUp, CheckCircle2, Sparkles, RefreshCw, AlertCircle, Clock, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassStatCard, GlassButton, PageHeader, Skeleton } from '../components/ui';
import EmptyState from '../components/common/EmptyState';
import { useChartTheme, chartTooltipStyle } from '../context/ThemeContext';

const PERIOD_OPTIONS = [
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'This Year' },
];

const ReportsPage = () => {
  const chart = useChartTheme();
  const [period, setPeriod] = useState('6months');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchReports = useCallback(async (selectedPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await reportsAPI.getReports({ period: selectedPeriod });
      setReportData(resp.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load reporting data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    reportsAPI.getReports({ period })
      .then((resp) => {
        if (isCurrent) {
          setReportData(resp.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          console.error('Error fetching reports:', err);
          setError(err.response?.data?.detail || err.message || 'Failed to load reporting data.');
        }
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [period]);

  const summary = reportData?.summary || {};
  const monthlyDelivery = reportData?.monthlyDelivery || [];
  const aiUsageTrends = reportData?.aiUsageTrends || [];

  const wishesSent = summary.wishesSent ?? 0;
  const wishesDelivered = summary.wishesDelivered ?? 0;
  const wishesScheduled = summary.wishesScheduled ?? 0;
  const wishesFailed = summary.wishesFailed ?? 0;
  const aiTotal = summary.aiGreetingsUsed ?? 0;
  const successRate = summary.successRate != null ? `${summary.successRate}%` : '100%';

  const hasDeliveryData = monthlyDelivery.some((d) => d.sent > 0 || d.delivered > 0 || d.failed > 0);
  const hasAiData = aiUsageTrends.some((d) => d.count > 0);

  const exportPDF = async () => {
    if (!reportData) {
      toast.error('No reporting data to export.');
      return;
    }

    setExporting(true);
    const toastId = toast.loading('Generating PDF report...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Page background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 297, 'F');

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');

      // Decorative top accent bar
      doc.setFillColor(99, 102, 241); // indigo-500
      doc.rect(0, 0, 210, 3, 'F');

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('AUTOWISH ANALYTICS & REPORTS', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Delivery insights & AI greeting statistics (${PERIOD_OPTIONS.find((p) => p.value === period)?.label || period})`, 14, 26);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Verified Account Data`, 14, 33);

      // Section: Key Performance Indicators
      let y = 50;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Key Performance Indicators', 14, y);

      y += 6;
      const kpis = [
        { label: 'Total Wishes Sent', value: String(wishesSent), hint: `${wishesDelivered} successfully delivered` },
        { label: 'Email Success Rate', value: String(successRate), hint: `${wishesFailed} failed deliveries` },
        { label: 'AI Greetings Used', value: String(aiTotal), hint: `${wishesScheduled} pending in queue` },
      ];

      kpis.forEach((kpi, idx) => {
        const x = 14 + idx * 62;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, 58, 26, 3, 3, 'FD');

        doc.setFillColor(idx === 0 ? 59 : idx === 1 ? 16 : 139, idx === 0 ? 130 : idx === 1 ? 185 : 92, idx === 0 ? 246 : idx === 1 ? 129 : 246);
        doc.rect(x + 2, y, 54, 1.5, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, x + 5, y + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(kpi.value, x + 5, y + 17);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(kpi.hint, x + 5, y + 22);
      });

      // Section: Delivery Performance Table
      y += 38;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Periodic Delivery Performance Breakdown', 14, y);

      y += 6;
      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 9, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y + 9, 196, y + 9);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('PERIOD', 20, y + 6);
      doc.text('WISHES SENT', 65, y + 6);
      doc.text('DELIVERED', 115, y + 6);
      doc.text('SUCCESS RATE', 160, y + 6);

      y += 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      if (monthlyDelivery.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('No historical delivery data recorded for this time frame.', 20, y + 6);
        y += 10;
      } else {
        monthlyDelivery.forEach((row, i) => {
          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, y, 182, 8, 'F');
          }
          doc.setTextColor(30, 41, 59);
          doc.text(row.month || `Period ${i + 1}`, 20, y + 5.5);
          doc.text(String(row.sent), 65, y + 5.5);
          doc.text(String(row.delivered), 115, y + 5.5);
          doc.text(`${row.successRate ?? 100}%`, 160, y + 5.5);

          y += 8;
          doc.setDrawColor(241, 245, 249);
          doc.line(14, y, 196, y);
        });
      }

      // Summary Note
      y += 12;
      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(14, y, 182, 22, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(67, 56, 202);
      doc.text('Data Authenticity & Verification', 20, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text('• Real-time aggregations calculated directly from authenticated PostgreSQL records.', 20, y + 13);
      doc.text(`• Total scheduled wishes in queue: ${wishesScheduled} | Total delivery attempts: ${wishesSent + wishesFailed}.`, 20, y + 18);

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 280, 196, 280);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('AutoWish Automated AI Wish Delivery System - User Reports', 14, 286);
      doc.text('Page 1 of 1', 182, 286);

      doc.save(`autowish-report-${period}.pdf`);
      toast.dismiss(toastId);
      toast.success('PDF report downloaded successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.dismiss(toastId);
      toast.error('Failed to generate PDF report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Detailed message delivery insights, AI generation trends, and exportable reports."
        icon={BarChart3}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Selector Tabs */}
            <div className="flex items-center bg-raised/80 rounded-xl p-1 border border-line-soft">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    period === opt.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <GlassButton
              variant="secondary"
              size="sm"
              onClick={exportPDF}
              disabled={exporting || loading || !!error}
              leftIcon={<Download size={15} />}
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </GlassButton>
          </div>
        }
      />

      {/* Recoverable Error State */}
      {error && !loading && (
        <GlassCard className="p-6 border-rose-500/30 bg-rose-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">Unable to Load Reports Data</h3>
                <p className="text-xs text-slate-400">{error}</p>
              </div>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => fetchReports(period)}
              leftIcon={<RefreshCw size={14} />}
            >
              Retry
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} className="p-5 space-y-3">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </GlassCard>
            ))}
          </div>
          <GlassCard className="p-6 h-80 flex flex-col justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
            <Skeleton className="h-52 w-full rounded-xl" />
          </GlassCard>
        </div>
      ) : (
        <>
          {/* Real Database Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassStatCard
              icon={TrendingUp}
              accent="blue"
              label="Total Wishes Sent"
              value={wishesSent}
              hint={`${wishesDelivered} delivered · ${wishesFailed} failed`}
            />
            <GlassStatCard
              icon={CheckCircle2}
              accent="emerald"
              label="Email Success Rate"
              value={successRate}
              hint="Calculated from real delivery logs"
            />
            <GlassStatCard
              icon={Sparkles}
              accent="violet"
              label="AI Greetings Used"
              value={aiTotal}
              hint={`${wishesScheduled} scheduled in queue`}
            />
          </div>

          {/* Monthly Delivery Performance */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-fg">Delivery Performance</h2>
                <p className="text-xs text-slate-500">
                  Real sent vs delivered counts from your database ({PERIOD_OPTIONS.find((p) => p.value === period)?.label || period})
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: chart.primary }} /> Sent
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: chart.success }} /> Delivered
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f43f5e' }} /> Failed
                </span>
              </div>
            </div>

            {!hasDeliveryData ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Clock className="text-slate-500 mb-2" size={32} />
                <p className="text-sm font-semibold text-fg">No Delivery Activity In This Period</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Scheduled wishes and email dispatches will appear here once delivered.
                </p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyDelivery} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                    <XAxis dataKey="month" stroke={chart.axis} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={chart.axis} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle(chart)} />
                    <Bar dataKey="sent" fill={chart.primary} name="Sent" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" fill={chart.success} name="Delivered" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" fill="#f43f5e" name="Failed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>

          {/* AI Usage Trends */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-fg">AI Usage Trends</h2>
                <p className="text-xs text-slate-500">
                  Actual AI greeting generations logged in PostgreSQL
                </p>
              </div>
            </div>

            {!hasAiData ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Sparkles className="text-slate-500 mb-2" size={32} />
                <p className="text-sm font-semibold text-fg">No AI Greetings Generated Yet</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Generated AI greetings for contacts will be tracked and displayed here over time.
                </p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aiUsageTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                    <XAxis dataKey="month" stroke={chart.axis} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={chart.axis} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle(chart)} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Greetings Generated"
                      stroke={chart.secondary}
                      strokeWidth={3}
                      dot={{ r: 4, fill: chart.secondary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
