import { useEffect, useState } from "react";
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

// Transaction row component
const TransactionRow = ({ data, rank }) => (
  <tr className="border-b hover:bg-gray-50 transition-colors">
    <td className="py-3 px-4 text-center text-gray-600">{rank}</td>
    <td className="py-3 px-4 font-medium text-blue-600">{data.terminal_id}</td>
    <td className="py-3 px-4 text-gray-700">{data.terminal_location}</td>
    <td className="py-3 px-4 text-right font-semibold text-green-600">{formatNumber(data.sukses)}</td>
    <td className="py-3 px-4 text-right text-blue-600">{formatRupiah(data.repay_nominal)}</td>
  </tr>
);

function App() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axios.get(`${API}/report/summary`);
        setSummary(response.data);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Gagal memuat data. Silakan coba lagi.');
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">📊 Laporan REPAY ATM</h1>
              <p className="text-gray-500 mt-1">Bank {summary?.bank_code} | Periode: {summary?.period}</p>
            </div>
            <div className="bg-blue-100 px-4 py-2 rounded-lg">
              <span className="text-blue-800 font-semibold">{formatNumber(summary?.total_terminals || 0)} Terminal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-xl shadow-md p-2 inline-flex gap-2" data-testid="navigation-tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-overview"
          >
            📈 Overview
          </button>
          <button
            onClick={() => setActiveTab('top')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'top' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-top"
          >
            🏆 Top Terminal
          </button>
          <button
            onClick={() => setActiveTab('bottom')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'bottom' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            data-testid="tab-bottom"
          >
            📉 Bottom Terminal
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
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
                    <TransactionRow key={terminal.terminal_id} data={terminal} rank={idx + 1} />
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
                    <TransactionRow key={terminal.terminal_id} data={terminal} rank={idx + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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
