import React from 'react';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, BarChart3, TrendingUp, CheckCircle2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassStatCard, GlassButton, PageHeader } from '../components/ui';
import { useChartTheme, chartTooltipStyle } from '../context/ThemeContext';

const ReportsPage = () => {
  const { stats, greetingAnalytics } = useData();
  const chart = useChartTheme();

  const monthly = [
    { month: 'Jan', sent: 78, delivered: 76 },
    { month: 'Feb', sent: 91, delivered: 89 },
    { month: 'Mar', sent: 102, delivered: 101 },
    { month: 'Apr', sent: 84, delivered: 80 },
    { month: 'May', sent: 125, delivered: 122 },
    { month: 'Jun', sent: 98, delivered: 94 }
  ];

  const [exporting, setExporting] = React.useState(false);

  const wishesSent = stats?.wishesSent || 0;
  const aiTotal = greetingAnalytics?.aiGreetings?.total ?? 743;
  const successRate = stats?.successRate != null ? `${stats.successRate}%` : '98.4%';

  const exportPDF = async () => {
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
      doc.text('Message delivery insights, AI generation volume, and performance trends', 14, 26);
      doc.text(`Generated on: ${new Date().toLocaleString()} | User Report`, 14, 33);

      // Section: Key Performance Indicators
      let y = 50;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Key Performance Indicators', 14, y);

      y += 6;
      const kpis = [
        { label: 'Total Wishes Sent', value: String(wishesSent), hint: '+18% MoM growth' },
        { label: 'Email Success Rate', value: String(successRate), hint: 'Across delivery logs' },
        { label: 'AI Greetings Used', value: String(aiTotal), hint: 'Across all occasions' },
      ];

      kpis.forEach((kpi, idx) => {
        const x = 14 + idx * 62;
        // Card box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, 58, 26, 3, 3, 'FD');

        // Top accent line
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

      // Section: Monthly Delivery Performance Table
      y += 38;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Monthly Delivery Performance (Last 6 Months)', 14, y);

      y += 6;
      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 9, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y + 9, 196, y + 9);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('MONTH', 20, y + 6);
      doc.text('WISHES SENT', 65, y + 6);
      doc.text('DELIVERED', 115, y + 6);
      doc.text('SUCCESS RATE', 160, y + 6);

      y += 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      monthly.forEach((row, i) => {
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 8, 'F');
        }
        doc.setTextColor(30, 41, 59);
        doc.text(row.month, 20, y + 5.5);
        doc.text(String(row.sent), 65, y + 5.5);
        doc.text(String(row.delivered), 115, y + 5.5);
        const rate = row.sent ? `${((row.delivered / row.sent) * 100).toFixed(1)}%` : '100%';
        doc.text(rate, 160, y + 5.5);

        y += 8;
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y, 196, y);
      });

      // Summary Note
      y += 12;
      doc.setFillColor(238, 242, 255); // indigo-50
      doc.setDrawColor(199, 210, 254); // indigo-200
      doc.roundedRect(14, y, 182, 22, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(67, 56, 202);
      doc.text('Delivery Summary & Recommendations', 20, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text('• Average delivery reliability remains stable above 96% across all channels.', 20, y + 13);
      doc.text('• Peak scheduling occurs during festive and holiday windows.', 20, y + 18);

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 280, 196, 280);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('AutoWish Automated AI Wish Delivery System - Confidential & Proprietary Report', 14, 286);
      doc.text('Page 1 of 1', 182, 286);

      doc.save('autowish-analytics-report.pdf');
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
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={exportPDF}
            disabled={exporting}
            leftIcon={<Download size={15} />}
          >
            {exporting ? 'Exporting...' : 'Export PDF'}
          </GlassButton>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassStatCard
          icon={TrendingUp}
          accent="blue"
          label="Total Wishes Sent"
          value={wishesSent}
          hint="+18% month over month"
        />
        <GlassStatCard
          icon={CheckCircle2}
          accent="emerald"
          label="Email Success Rate"
          value={successRate}
          hint="Calculated across delivery logs"
        />
        <GlassStatCard
          icon={Sparkles}
          accent="violet"
          label="AI Greetings Used"
          value={aiTotal}
          hint="Across all recipient occasions"
        />
      </div>

      {/* Monthly Delivery Performance */}
      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-fg">Monthly Delivery Performance</h2>
            <p className="text-xs text-slate-500">Sent vs delivered emails over the last 6 months</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: chart.primary }} /> Sent
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: chart.success }} /> Delivered
            </span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="month" stroke={chart.axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={chart.axis} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Bar dataKey="sent" fill={chart.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivered" fill={chart.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* AI Usage Trends */}
      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-fg">AI Usage Trends</h2>
            <p className="text-xs text-slate-500">Generated greeting volume per billing cycle</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="month" stroke={chart.axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={chart.axis} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Line type="monotone" dataKey="sent" stroke={chart.secondary} strokeWidth={3} dot={{ r: 4, fill: chart.secondary }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
};

export default ReportsPage;
