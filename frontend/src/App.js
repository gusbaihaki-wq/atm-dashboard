import { useEffect, useState, useCallback } from "react";
import "@/App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Format currency to Indonesian Rupiah
const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

// Format number with thousand separator
const formatNumber = (num) => {
  return new Intl.NumberFormat('id-ID').format(num);
};

// Export to CSV function
const exportToCSV = (data, filename, columns) => {
  const headers = columns.map(col => col.label).join(',');
  const rows = data.map(row => 
    columns.map(col => {
      let value = row[col.key];
      if (typeof value === 'string' && value.includes(',')) {
        value = `"${value}"`;
      }
      return value;
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

// Export to Excel function
const exportToExcel = (data, filename, columns) => {
  const headers = columns.map(col => col.label).join('\t');
  const rows = data.map(row => 
    columns.map(col => row[col.key]).join('\t')
  );
  
  const excel = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + excel], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xls`;
  link.click();
};

// Card component for statistics
const StatCard = ({ title, value, icon, color }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color}`} data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      <div className={`text-4xl opacity-30 ${color.replace('border-', 'text-')}`}>
        {icon}
      </div>
    </div>
  </div>
);

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    'Sukses': { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
    'Gagal Sistem Bank': { bg: 'bg-red-100', text: 'text-red-700', icon: '🏦' },
    'Gagal Nasabah': { bg: 'bg-orange-100', text: 'text-orange-700', icon: '👤' },
    'Gagal Sistem Jalin': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🔗' }
  };
  
  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '❓' };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon} {status}
    </span>
  );
};

// Detail Transaction Row Component (individual transactions)
const DetailTransactionRow = ({ data, index }) => (
  <tr className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
    <td className="py-2 px-3 text-center text-gray-600 text-sm">{index + 1}</td>
    <td className="py-2 px-3 text-gray-500 text-sm">{data.data_date || '-'}</td>
    <td className="py-2 px-3 font-medium text-blue-600 text-sm">{data.terminal_id}</td>
    <td className="py-2 px-3 text-gray-700 text-sm">{data.terminal_location}</td>
    <td className="py-2 px-3"><StatusBadge status={data.status} /></td>
  </tr>
);

// Terminal Summary Row Component
const TerminalSummaryRow = ({ data, index }) => (
  <tr className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
    <td className="py-2 px-3 text-center text-gray-600 text-sm">{index + 1}</td>
    <td className="py-2 px-3 font-medium text-blue-600 text-sm">{data.terminal_id}</td>
    <td className="py-2 px-3 text-gray-700 text-sm">{data.terminal_location}</td>
    <td className="py-2 px-3 text-right font-semibold text-sm">{formatNumber(data.total_transaksi)}</td>
    <td className="py-2 px-3 text-right text-green-600 font-semibold text-sm">{formatNumber(data.sukses)}</td>
    <td className="py-2 px-3 text-right text-red-500 text-sm">{formatNumber(data.gagal)}</td>
    <td className="py-2 px-3 text-right text-sm">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        data.success_rate >= 90 ? 'bg-green-100 text-green-700' :
        data.success_rate >= 70 ? 'bg-yellow-100 text-yellow-700' :
        'bg-red-100 text-red-700'
      }`}>
        {data.success_rate}%
      </span>
    </td>
    <td className="py-2 px-3 text-right text-purple-600 text-sm">{formatRupiah(data.biaya_gross)}</td>
    <td className="py-2 px-3 text-right text-sm">{data.proporsi_repay}%</td>
    <td className="py-2 px-3 text-right text-blue-600 font-semibold text-sm">{formatRupiah(data.repay_nominal)}</td>
  </tr>
);

// Export Buttons Component
const ExportButtons = ({ onExportCSV, onExportExcel, disabled }) => (
  <div className="flex gap-2">
    <button
      onClick={onExportCSV}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
        disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
      }`}
      data-testid="export-csv-btn"
    >
      📄 Export CSV
    </button>
    <button
      onClick={onExportExcel}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
        disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      data-testid="export-excel-btn"
    >
      📊 Export Excel
    </button>
  </div>
);

// File Upload Component with Date field
const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [period, setPeriod] = useState('');
  const [dataDate, setDataDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Pilih file terlebih dahulu' });
      return;
    }

    if (!dataDate) {
      setMessage({ type: 'error', text: 'Masukkan tanggal data' });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    if (period) formData.append('period', period);
    formData.append('data_date', dataDate);

    try {
      const response = await axios.post(`${API}/report/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Berhasil upload ${response.data.total_transactions} transaksi untuk tanggal ${response.data.data_date}` 
        });
        setFile(null);
        setPeriod('');
        setDataDate('');
        if (onUploadSuccess) onUploadSuccess(response.data.report_id);
      } else {
        setMessage({ type: 'warning', text: response.data.message });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Gagal upload file. Silakan coba lagi.' });
    } finally {
      setUploading(false);
    }
  };

  // Format date for display
  const formatDateForInput = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6" data-testid="file-upload-section">
      <h3 className="text-lg font-bold text-gray-800 mb-4">📤 Upload Laporan Baru</h3>
      
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">File Laporan (.txt, .csv) *</label>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="file-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">📅 Tanggal Data *</label>
          <input
            type="date"
            value={dataDate}
            onChange={(e) => setDataDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="date-input"
          />
          <p className="text-xs text-gray-500 mt-1">Tanggal saat data transaksi diambil</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Periode (opsional)</label>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Contoh: Januari 2026"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="period-input"
          />
        </div>

        <button
          type="submit"
          disabled={uploading || !file || !dataDate}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            uploading || !file || !dataDate
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          data-testid="upload-button"
        >
          {uploading ? '⏳ Mengupload...' : '📤 Upload File'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          message.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`} data-testid="upload-message">
          {message.text}
        </div>
      )}
    </div>
  );
};

// Report Selector Component
const ReportSelector = ({ reports, selectedReport, onSelectReport }) => {
  if (!reports || reports.length === 0) return null;

  return (
    <div className="mb-6" data-testid="report-selector">
      <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Laporan:</label>
      <select
        value={selectedReport || ''}
        onChange={(e) => onSelectReport(e.target.value || null)}
        className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        data-testid="report-select"
      >
        <option value="">-- Data Awal (25-12-2025) --</option>
        {reports.map((report) => (
          <option key={report.id} value={report.id}>
            {report.data_date || '-'} | {report.period} - {report.filename}
          </option>
        ))}
      </select>
    </div>
  );
};

function App() {
  const [summary, setSummary] = useState(null);
  const [detailTransactions, setDetailTransactions] = useState([]);
  const [terminalSummary, setTerminalSummary] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [detailSearchTerm, setDetailSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [terminalSearchTerm, setTerminalSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [exporting, setExporting] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reports`);
      setReports(response.data.reports || []);
    } catch (e) {
      console.error('Error fetching reports:', e);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const url = selectedReport 
        ? `${API}/report/summary?report_id=${selectedReport}`
        : `${API}/report/summary`;
      const response = await axios.get(url);
      setSummary(response.data);
    } catch (e) {
      console.error(e);
      setError('Gagal memuat data. Silakan coba lagi.');
    }
  }, [selectedReport]);

  const fetchDetailTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 100,
        search: detailSearchTerm,
        status_filter: statusFilter
      });
      if (selectedReport) params.append('report_id', selectedReport);

      const response = await axios.get(`${API}/report/transactions-detail?${params}`);
      setDetailTransactions(response.data.data || []);
      setTotalPages(response.data.pages || 1);
      setTotalTransactions(response.data.total || 0);
    } catch (e) {
      console.error(e);
    }
  }, [currentPage, detailSearchTerm, statusFilter, selectedReport]);

  const fetchTerminalSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ search: terminalSearchTerm });
      if (selectedReport) params.append('report_id', selectedReport);

      const response = await axios.get(`${API}/report/terminal-summary?${params}`);
      setTerminalSummary(response.data.data || []);
    } catch (e) {
      console.error(e);
    }
  }, [terminalSearchTerm, selectedReport]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchReports();
      await fetchSummary();
      await fetchDetailTransactions();
      await fetchTerminalSummary();
      setLoading(false);
    };
    loadData();
  }, [fetchReports, fetchSummary, fetchDetailTransactions, fetchTerminalSummary]);

  useEffect(() => {
    if (!loading) {
      fetchSummary();
      fetchDetailTransactions();
      fetchTerminalSummary();
    }
  }, [selectedReport, fetchSummary, fetchDetailTransactions, fetchTerminalSummary, loading]);

  useEffect(() => {
    if (!loading) {
      setCurrentPage(1);
      fetchDetailTransactions();
    }
  }, [detailSearchTerm, statusFilter, fetchDetailTransactions, loading]);

  useEffect(() => {
    if (!loading) {
      fetchDetailTransactions();
    }
  }, [currentPage, fetchDetailTransactions, loading]);

  useEffect(() => {
    if (!loading) {
      fetchTerminalSummary();
    }
  }, [terminalSearchTerm, fetchTerminalSummary, loading]);

  const handleUploadSuccess = (reportId) => {
    fetchReports();
    setSelectedReport(reportId);
  };

  // Export handlers for Detail Transactions
  const handleExportDetailCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ 
        search: detailSearchTerm,
        status_filter: statusFilter
      });
      if (selectedReport) params.append('report_id', selectedReport);
      
      const response = await axios.get(`${API}/report/transactions-detail/export?${params}`);
      const data = response.data.data || [];
      
      const columns = [
        { key: 'data_date', label: 'Tanggal Data' },
        { key: 'terminal_id', label: 'Terminal ID' },
        { key: 'terminal_location', label: 'Lokasi' },
        { key: 'status', label: 'Status' }
      ];
      
      exportToCSV(data, `detail_transaksi_${summary?.period || 'data'}`, columns);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportDetailExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ 
        search: detailSearchTerm,
        status_filter: statusFilter
      });
      if (selectedReport) params.append('report_id', selectedReport);
      
      const response = await axios.get(`${API}/report/transactions-detail/export?${params}`);
      const data = response.data.data || [];
      
      const columns = [
        { key: 'data_date', label: 'Tanggal Data' },
        { key: 'terminal_id', label: 'Terminal ID' },
        { key: 'terminal_location', label: 'Lokasi' },
        { key: 'status', label: 'Status' }
      ];
      
      exportToExcel(data, `detail_transaksi_${summary?.period || 'data'}`, columns);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  // Export handlers for Terminal Summary
  const handleExportTerminalCSV = () => {
    const columns = [
      { key: 'terminal_id', label: 'Terminal ID' },
      { key: 'terminal_location', label: 'Lokasi' },
      { key: 'total_transaksi', label: 'Total Transaksi' },
      { key: 'sukses', label: 'Sukses' },
      { key: 'gagal', label: 'Gagal' },
      { key: 'success_rate', label: 'Success Rate (%)' },
      { key: 'biaya_gross', label: 'Biaya Gross' },
      { key: 'proporsi_repay', label: 'Proporsi (%)' },
      { key: 'repay_nominal', label: 'Repay Nominal' }
    ];
    
    exportToCSV(terminalSummary, `ringkasan_terminal_${summary?.period || 'data'}`, columns);
  };

  const handleExportTerminalExcel = () => {
    const columns = [
      { key: 'terminal_id', label: 'Terminal ID' },
      { key: 'terminal_location', label: 'Lokasi' },
      { key: 'total_transaksi', label: 'Total Transaksi' },
      { key: 'sukses', label: 'Sukses' },
      { key: 'gagal', label: 'Gagal' },
      { key: 'success_rate', label: 'Success Rate (%)' },
      { key: 'biaya_gross', label: 'Biaya Gross' },
      { key: 'proporsi_repay', label: 'Proporsi (%)' },
      { key: 'repay_nominal', label: 'Repay Nominal' }
    ];
    
    exportToExcel(terminalSummary, `ringkasan_terminal_${summary?.period || 'data'}`, columns);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">📊 Laporan REPAY ATM</h1>
              <p className="text-gray-500 mt-1">Bank {summary?.bank_code} | Periode: {summary?.period}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 px-4 py-2 rounded-lg">
                <span className="text-blue-800 font-semibold">{formatNumber(summary?.total_terminals || 0)} Terminal</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-xl shadow-md p-2 inline-flex gap-2 flex-wrap" data-testid="navigation-tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-overview"
          >
            📈 Overview
          </button>
          <button
            onClick={() => setActiveTab('detail')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'detail' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-detail"
          >
            📋 Detail Transaksi
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'terminal' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-terminal"
          >
            🏧 Ringkasan Terminal
          </button>
          <button
            onClick={() => setActiveTab('top')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'top' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-top"
          >
            🏆 Top Terminal
          </button>
          <button
            onClick={() => setActiveTab('bottom')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'bottom' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-bottom"
          >
            📉 Bottom Terminal
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'upload' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-upload"
          >
            📤 Upload
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Report Selector */}
        {activeTab !== 'upload' && (
          <ReportSelector 
            reports={reports} 
            selectedReport={selectedReport} 
            onSelectReport={setSelectedReport} 
          />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Summary Stats */}
            <section data-testid="summary-section">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Ringkasan Transaksi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Transaksi Sukses"
                  value={formatNumber(summary?.total_transaksi_sukses || 0)}
                  icon="✅"
                  color="border-green-500"
                />
                <StatCard
                  title="Gagal Sistem Bank"
                  value={formatNumber(summary?.total_gagal_sistem_bank || 0)}
                  icon="🏦"
                  color="border-red-500"
                />
                <StatCard
                  title="Gagal Nasabah"
                  value={formatNumber(summary?.total_gagal_nasabah || 0)}
                  icon="👤"
                  color="border-orange-500"
                />
                <StatCard
                  title="Gagal Sistem Jalin"
                  value={formatNumber(summary?.total_gagal_sistem_jalin || 0)}
                  icon="🔗"
                  color="border-yellow-500"
                />
              </div>
            </section>

            {/* Financial Summary */}
            <section data-testid="financial-section">
              <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Ringkasan Keuangan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                  <p className="text-blue-100 text-sm font-medium uppercase">Total Transaksi Ditagihkan</p>
                  <p className="text-3xl font-bold mt-2">{formatNumber(summary?.total_transaksi_ditagihkan || 0)}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                  <p className="text-purple-100 text-sm font-medium uppercase">Total Biaya Gross</p>
                  <p className="text-3xl font-bold mt-2">{formatRupiah(summary?.total_biaya_gross || 0)}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                  <p className="text-green-100 text-sm font-medium uppercase">Total Repay Nominal</p>
                  <p className="text-3xl font-bold mt-2">{formatRupiah(summary?.total_repay_nominal || 0)}</p>
                </div>
              </div>
            </section>

            {/* Proporsi Repay Distribution */}
            <section data-testid="distribution-section">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Distribusi Proporsi Repay</h2>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-center mb-6">
                  <span className="text-4xl font-bold text-blue-600">{summary?.avg_proporsi_repay || 0}%</span>
                  <span className="ml-2 text-gray-500">Rata-rata Proporsi Repay</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {summary?.proporsi_distribution && Object.entries(summary.proporsi_distribution).map(([key, value]) => (
                    <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-800">{value}</p>
                      <p className="text-sm text-gray-500 mt-1">{key.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'detail' && (
          <section data-testid="detail-section">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
              <h2 className="text-xl font-bold text-gray-800">📋 Detail Transaksi ({formatNumber(totalTransactions)} transaksi)</h2>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <input
                  type="text"
                  placeholder="Cari terminal ID atau lokasi..."
                  value={detailSearchTerm}
                  onChange={(e) => setDetailSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-56"
                  data-testid="detail-search-input"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="status-filter"
                >
                  <option value="">Semua Status</option>
                  <option value="Sukses">✅ Sukses</option>
                  <option value="Gagal Sistem Bank">🏦 Gagal Sistem Bank</option>
                  <option value="Gagal Nasabah">👤 Gagal Nasabah</option>
                  <option value="Gagal Sistem Jalin">🔗 Gagal Sistem Jalin</option>
                </select>
                <ExportButtons 
                  onExportCSV={handleExportDetailCSV}
                  onExportExcel={handleExportDetailExcel}
                  disabled={exporting}
                />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
                  <tr>
                    <th className="py-3 px-3 text-center w-16">No</th>
                    <th className="py-3 px-3 text-left">Tanggal Data</th>
                    <th className="py-3 px-3 text-left">Terminal ID</th>
                    <th className="py-3 px-3 text-left">Lokasi</th>
                    <th className="py-3 px-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTransactions.map((t, idx) => (
                    <DetailTransactionRow key={`${t.terminal_id}-${t.status}-${idx}`} data={t} index={(currentPage - 1) * 100 + idx} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mt-6" data-testid="pagination">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg ${currentPage === 1 ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                ← Prev
              </button>
              <span className="px-4 py-2 bg-white rounded-lg shadow">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg ${currentPage === totalPages ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Next →
              </button>
            </div>
          </section>
        )}

        {activeTab === 'terminal' && (
          <section data-testid="terminal-summary-section">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h2 className="text-xl font-bold text-gray-800">🏧 Ringkasan Per Terminal ({formatNumber(terminalSummary.length)} terminal)</h2>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <input
                  type="text"
                  placeholder="Cari terminal ID atau lokasi..."
                  value={terminalSearchTerm}
                  onChange={(e) => setTerminalSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                  data-testid="terminal-search-input"
                />
                <ExportButtons 
                  onExportCSV={handleExportTerminalCSV}
                  onExportExcel={handleExportTerminalExcel}
                  disabled={terminalSummary.length === 0}
                />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-3 text-left">Terminal ID</th>
                    <th className="py-3 px-3 text-left">Lokasi</th>
                    <th className="py-3 px-3 text-right">Total Transaksi</th>
                    <th className="py-3 px-3 text-right">Sukses</th>
                    <th className="py-3 px-3 text-right">Gagal</th>
                    <th className="py-3 px-3 text-right">Success Rate</th>
                    <th className="py-3 px-3 text-right">Biaya Gross</th>
                    <th className="py-3 px-3 text-right">Proporsi</th>
                    <th className="py-3 px-3 text-right">Repay Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {terminalSummary.map((t, idx) => (
                    <TerminalSummaryRow key={t.terminal_id} data={t} index={idx} />
                  ))}
                </tbody>
              </table>
            </div>

            {terminalSummary.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg mt-4">
                <p className="text-gray-500">Tidak ada data yang ditemukan</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'top' && (
          <section data-testid="top-terminals-section">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 10 Terminal (Transaksi Sukses Tertinggi)</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <tr>
                    <th className="py-4 px-4 text-center">Rank</th>
                    <th className="py-4 px-4 text-left">Terminal ID</th>
                    <th className="py-4 px-4 text-left">Lokasi</th>
                    <th className="py-4 px-4 text-right">Transaksi Sukses</th>
                    <th className="py-4 px-4 text-right">Repay Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.top_terminals?.map((terminal, idx) => (
                    <tr key={terminal.terminal_id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-center text-gray-600">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-blue-600">{terminal.terminal_id}</td>
                      <td className="py-3 px-4 text-gray-700">{terminal.terminal_location}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">{formatNumber(terminal.sukses)}</td>
                      <td className="py-3 px-4 text-right text-blue-600">{formatRupiah(terminal.repay_nominal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'bottom' && (
          <section data-testid="bottom-terminals-section">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📉 Bottom 10 Terminal (Transaksi Sukses Terendah)</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <tr>
                    <th className="py-4 px-4 text-center">Rank</th>
                    <th className="py-4 px-4 text-left">Terminal ID</th>
                    <th className="py-4 px-4 text-left">Lokasi</th>
                    <th className="py-4 px-4 text-right">Transaksi Sukses</th>
                    <th className="py-4 px-4 text-right">Repay Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.bottom_terminals?.map((terminal, idx) => (
                    <tr key={terminal.terminal_id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-center text-gray-600">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-blue-600">{terminal.terminal_id}</td>
                      <td className="py-3 px-4 text-gray-700">{terminal.terminal_location}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">{formatNumber(terminal.sukses)}</td>
                      <td className="py-3 px-4 text-right text-blue-600">{formatRupiah(terminal.repay_nominal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            
            {/* List of uploaded reports */}
            {reports.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6" data-testid="reports-list">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📁 Laporan yang Sudah Diupload</h3>
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-800">📅 {report.data_date || '-'}</p>
                        <p className="text-sm text-gray-600">{report.period} - {report.filename}</p>
                        <p className="text-xs text-gray-400">
                          Upload: {new Date(report.upload_date).toLocaleDateString('id-ID', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{formatNumber(report.total_terminals)} Terminal</p>
                        <p className="text-sm text-green-600">{formatNumber(report.total_transaksi_sukses)} Sukses</p>
                        <p className="text-xs text-blue-600">{formatRupiah(report.total_repay_nominal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500">
          <p>Laporan REPAY ATM Platform | Bank {summary?.bank_code} | Periode {summary?.period}</p>
          <p className="text-sm mt-1">Report Code: 73A | Data diambil dari file laporan bulanan</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
