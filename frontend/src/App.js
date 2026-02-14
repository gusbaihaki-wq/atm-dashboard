import { useEffect, useState, useCallback } from "react";
import "@/App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
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

// Bank badge component
const BankBadge = ({ bank }) => {
  const bankConfig = {
    'Mandiri': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'BNI': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'BTN': { bg: 'bg-green-100', text: 'text-green-700' },
    'BRI': { bg: 'bg-indigo-100', text: 'text-indigo-700' }
  };
  
  const config = bankConfig[bank] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${config.bg} ${config.text}`}>
      {bank}
    </span>
  );
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

// Detail Transaction Row Component
const DetailTransactionRow = ({ data, index }) => (
  <tr className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
    <td className="py-2 px-3 text-center text-gray-600 text-sm">{index + 1}</td>
    <td className="py-2 px-3 text-gray-500 text-sm">{data.data_date || '-'}</td>
    <td className="py-2 px-3"><BankBadge bank={data.bank} /></td>
    <td className="py-2 px-3 font-medium text-blue-600 text-sm">{data.terminal_id}</td>
    <td className="py-2 px-3 text-gray-700 text-sm">{data.terminal_location}</td>
    <td className="py-2 px-3"><StatusBadge status={data.status} /></td>
  </tr>
);

// Get transaction count indicator color
const getTransactionIndicator = (total) => {
  if (total >= 100) return { bg: 'bg-green-500', text: 'text-white', label: '🟢' };
  if (total >= 75) return { bg: 'bg-blue-500', text: 'text-white', label: '🔵' };
  if (total >= 60) return { bg: 'bg-yellow-400', text: 'text-gray-800', label: '🟡' };
  return { bg: 'bg-red-500', text: 'text-white', label: '🔴' };
};

// Terminal Summary Row Component
const TerminalSummaryRow = ({ data, index }) => {
  const indicator = getTransactionIndicator(data.total_transaksi);
  return (
    <tr className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      <td className="py-2 px-3 text-center text-gray-600 text-sm">{index + 1}</td>
      <td className="py-2 px-3"><BankBadge bank={data.bank} /></td>
      <td className="py-2 px-3 font-medium text-blue-600 text-sm">{data.terminal_id}</td>
      <td className="py-2 px-3 text-gray-700 text-sm">{data.terminal_location}</td>
      <td className="py-2 px-3 text-right text-sm">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${indicator.bg} ${indicator.text}`}>
          {formatNumber(data.total_transaksi)}
        </span>
      </td>
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
};

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
      📄 CSV
    </button>
    <button
      onClick={onExportExcel}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
        disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      data-testid="export-excel-btn"
    >
      📊 Excel
    </button>
  </div>
);

// File Upload Component
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
        setMessage({ type: 'success', text: `Berhasil upload ${response.data.total_transactions} transaksi` });
        setFile(null);
        setPeriod('');
        setDataDate('');
        if (onUploadSuccess) onUploadSuccess(response.data.report_id);
      } else {
        setMessage({ type: 'warning', text: response.data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal upload file.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">📤 Upload Laporan REPAY</h3>
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">File (.txt, .csv) *</label>
          <input type="file" accept=".txt,.csv" onChange={(e) => setFile(e.target.files[0])}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">📅 Tanggal Data *</label>
          <input type="date" value={dataDate} onChange={(e) => setDataDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Periode (opsional)</label>
          <input type="text" value={period} onChange={(e) => setPeriod(e.target.value)}
            placeholder="Contoh: Januari 2026" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <button type="submit" disabled={uploading || !file || !dataDate}
          className={`w-full py-3 rounded-lg font-medium ${uploading || !file || !dataDate ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {uploading ? '⏳ Mengupload...' : '📤 Upload'}
        </button>
      </form>
      {message && (
        <div className={`mt-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : message.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

// ATM Activation Form Modal
const ActivationFormModal = ({ isOpen, onClose, onSave, editData }) => {
  const [formData, setFormData] = useState({
    terminal_id_sebelumnya: '',
    lokasi_sebelumnya: '',
    terminal_id_baru: '',
    lokasi: '',
    tanggal_aktivasi: '',
    tanggal_terminated: '',
    mitra_penyedia: '',
    mitra_rpl: '',
    mitra_slm: '',
    mitra_jarkom: '',
    mitra_cctv: '',
    mitra_ups: '',
    mitra_premises: ''
  });

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      setFormData({
        terminal_id_sebelumnya: '',
        lokasi_sebelumnya: '',
        terminal_id_baru: '',
        lokasi: '',
        tanggal_aktivasi: '',
        tanggal_terminated: '',
        mitra_penyedia: '',
        mitra_rpl: '',
        mitra_slm: '',
        mitra_jarkom: '',
        mitra_cctv: '',
        mitra_ups: '',
        mitra_premises: ''
      });
    }
  }, [editData, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.terminal_id_baru || !formData.lokasi || !formData.tanggal_aktivasi) {
      alert('Terminal ID Baru, Lokasi, dan Tanggal Aktivasi wajib diisi');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">{editData ? '✏️ Edit Data Aktivasi' : '➕ Tambah Data Aktivasi'}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-3">Data Terminal Sebelumnya (opsional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Terminal ID Sebelumnya</label>
                  <input type="text" value={formData.terminal_id_sebelumnya} onChange={(e) => handleChange('terminal_id_sebelumnya', e.target.value)}
                    placeholder="Kosongkan jika lokasi baru" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Lokasi Sebelumnya</label>
                  <input type="text" value={formData.lokasi_sebelumnya} onChange={(e) => handleChange('lokasi_sebelumnya', e.target.value)}
                    placeholder="Kosongkan jika lokasi baru" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>

            <div className="col-span-2 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-3">Data Terminal Baru *</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Terminal ID Baru *</label>
                  <input type="text" value={formData.terminal_id_baru} onChange={(e) => handleChange('terminal_id_baru', e.target.value)}
                    required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Lokasi *</label>
                  <input type="text" value={formData.lokasi} onChange={(e) => handleChange('lokasi', e.target.value)}
                    required className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">📅 Tanggal Aktivasi *</label>
              <input type="date" value={formData.tanggal_aktivasi} onChange={(e) => handleChange('tanggal_aktivasi', e.target.value)}
                required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">📅 Tanggal Terminated</label>
              <input type="date" value={formData.tanggal_terminated} onChange={(e) => handleChange('tanggal_terminated', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>

            <div className="col-span-2 bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-3">Data Mitra</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mitra Penyedia</label>
                  <input type="text" value={formData.mitra_penyedia} onChange={(e) => handleChange('mitra_penyedia', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mitra RPL</label>
                  <input type="text" value={formData.mitra_rpl} onChange={(e) => handleChange('mitra_rpl', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mitra SLM</label>
                  <input type="text" value={formData.mitra_slm} onChange={(e) => handleChange('mitra_slm', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mitra Jarkom</label>
                  <input type="text" value={formData.mitra_jarkom} onChange={(e) => handleChange('mitra_jarkom', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mitra CCTV</label>
                  <input type="text" value={formData.mitra_cctv} onChange={(e) => handleChange('mitra_cctv', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mitra UPS</label>
                  <input type="text" value={formData.mitra_ups} onChange={(e) => handleChange('mitra_ups', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mitra Premises</label>
                  <input type="text" value={formData.mitra_premises} onChange={(e) => handleChange('mitra_premises', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {editData ? '💾 Simpan Perubahan' : '➕ Tambah Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ATM Activation Tab Component
const ATMActivationTab = () => {
  const [activations, setActivations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchActivations = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 20, search: searchTerm });
      const response = await axios.get(`${API}/atm-activation?${params}`);
      setActivations(response.data.data || []);
      setTotalPages(response.data.pages || 1);
      setTotalRecords(response.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchActivations();
  }, [fetchActivations]);

  const handleSave = async (formData) => {
    try {
      if (editData) {
        await axios.put(`${API}/atm-activation/${editData.id}`, formData);
        setMessage({ type: 'success', text: 'Data berhasil diupdate' });
      } else {
        await axios.post(`${API}/atm-activation`, formData);
        setMessage({ type: 'success', text: 'Data berhasil ditambahkan' });
      }
      setShowModal(false);
      setEditData(null);
      fetchActivations();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menyimpan data' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await axios.delete(`${API}/atm-activation/${id}`);
      setMessage({ type: 'success', text: 'Data berhasil dihapus' });
      fetchActivations();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal menghapus data' });
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    try {
      const response = await axios.post(`${API}/atm-activation/upload`, formData);
      setMessage({ type: 'success', text: `Berhasil upload ${response.data.total_uploaded} data` });
      setUploadFile(null);
      fetchActivations();
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal upload file' });
    } finally {
      setUploading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API}/atm-activation/export?search=${searchTerm}`);
      const columns = [
        { key: 'no', label: 'No' },
        { key: 'bank', label: 'Bank' },
        { key: 'terminal_id_sebelumnya', label: 'TID Sebelumnya' },
        { key: 'lokasi_sebelumnya', label: 'Lokasi Sebelumnya' },
        { key: 'terminal_id_baru', label: 'TID Baru' },
        { key: 'lokasi', label: 'Lokasi' },
        { key: 'tanggal_aktivasi', label: 'Tgl Aktivasi' },
        { key: 'tanggal_terminated', label: 'Tgl Terminated' },
        { key: 'mitra_penyedia', label: 'Mitra Penyedia' },
        { key: 'mitra_rpl', label: 'Mitra RPL' },
        { key: 'mitra_slm', label: 'Mitra SLM' },
        { key: 'mitra_jarkom', label: 'Mitra Jarkom' },
        { key: 'mitra_cctv', label: 'Mitra CCTV' },
        { key: 'mitra_ups', label: 'Mitra UPS' },
        { key: 'mitra_premises', label: 'Mitra Premises' }
      ];
      exportToCSV(response.data.data, 'atm_aktivasi', columns);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await axios.get(`${API}/atm-activation/export?search=${searchTerm}`);
      const columns = [
        { key: 'no', label: 'No' },
        { key: 'bank', label: 'Bank' },
        { key: 'terminal_id_sebelumnya', label: 'TID Sebelumnya' },
        { key: 'lokasi_sebelumnya', label: 'Lokasi Sebelumnya' },
        { key: 'terminal_id_baru', label: 'TID Baru' },
        { key: 'lokasi', label: 'Lokasi' },
        { key: 'tanggal_aktivasi', label: 'Tgl Aktivasi' },
        { key: 'tanggal_terminated', label: 'Tgl Terminated' },
        { key: 'mitra_penyedia', label: 'Mitra Penyedia' },
        { key: 'mitra_rpl', label: 'Mitra RPL' },
        { key: 'mitra_slm', label: 'Mitra SLM' },
        { key: 'mitra_jarkom', label: 'Mitra Jarkom' },
        { key: 'mitra_cctv', label: 'Mitra CCTV' },
        { key: 'mitra_ups', label: 'Mitra UPS' },
        { key: 'mitra_premises', label: 'Mitra Premises' }
      ];
      exportToExcel(response.data.data, 'atm_aktivasi', columns);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right">&times;</button>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📤 Upload File ATM Aktivasi</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">File (.txt, .csv)</label>
            <input type="file" accept=".txt,.csv" onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <button onClick={handleUpload} disabled={!uploadFile || uploading}
            className={`px-6 py-2 rounded-lg font-medium ${!uploadFile || uploading ? 'bg-gray-300 text-gray-500' : 'bg-green-600 text-white hover:bg-green-700'}`}>
            {uploading ? '⏳ Uploading...' : '📤 Upload'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Format: TID Sebelumnya, Lokasi Sebelumnya, TID Baru, Lokasi, Tgl Aktivasi, Tgl Terminated, Mitra Penyedia, RPL, SLM, Jarkom, CCTV, UPS, Premises</p>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <h3 className="text-lg font-bold text-gray-800">🏧 Data ATM Aktivasi ({formatNumber(totalRecords)} data)</h3>
          <div className="flex flex-wrap gap-3 items-center">
            <input type="text" placeholder="Cari..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border rounded-lg w-48" />
            <button onClick={() => { setEditData(null); setShowModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">➕ Tambah</button>
            <ExportButtons onExportCSV={handleExportCSV} onExportExcel={handleExportExcel} disabled={activations.length === 0} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-teal-600 to-teal-700 text-white">
              <tr>
                <th className="py-3 px-2 text-center">No</th>
                <th className="py-3 px-2 text-left">Bank</th>
                <th className="py-3 px-2 text-left">TID Sebelum</th>
                <th className="py-3 px-2 text-left">Lokasi Sebelum</th>
                <th className="py-3 px-2 text-left">TID Baru</th>
                <th className="py-3 px-2 text-left">Lokasi</th>
                <th className="py-3 px-2 text-center">Aktivasi</th>
                <th className="py-3 px-2 text-center">Terminated</th>
                <th className="py-3 px-2 text-left">Penyedia</th>
                <th className="py-3 px-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {activations.map((item, idx) => (
                <tr key={item.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-2 px-2 text-center">{item.no}</td>
                  <td className="py-2 px-2"><BankBadge bank={item.bank} /></td>
                  <td className="py-2 px-2 text-gray-500">{item.terminal_id_sebelumnya || '-'}</td>
                  <td className="py-2 px-2 text-gray-500 max-w-[150px] truncate">{item.lokasi_sebelumnya || '-'}</td>
                  <td className="py-2 px-2 font-medium text-blue-600">{item.terminal_id_baru}</td>
                  <td className="py-2 px-2 max-w-[150px] truncate">{item.lokasi}</td>
                  <td className="py-2 px-2 text-center text-green-600">{item.tanggal_aktivasi || '-'}</td>
                  <td className="py-2 px-2 text-center text-red-500">{item.tanggal_terminated || '-'}</td>
                  <td className="py-2 px-2">{item.mitra_penyedia || '-'}</td>
                  <td className="py-2 px-2 text-center">
                    <button onClick={() => { setEditData(item); setShowModal(true); }}
                      className="text-blue-600 hover:text-blue-800 mr-2">✏️</button>
                    <button onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activations.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">Tidak ada data. Upload file atau tambah data manual.</div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg ${currentPage === 1 ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              ← Prev
            </button>
            <span className="px-4 py-2 bg-white rounded-lg shadow">Hal {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg ${currentPage === totalPages ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              Next →
            </button>
          </div>
        )}
      </div>

      <ActivationFormModal isOpen={showModal} onClose={() => { setShowModal(false); setEditData(null); }}
        onSave={handleSave} editData={editData} />
    </div>
  );
};


// Calculator Component
const Calculator = () => {
  // SP Data from the image
  const spData = [
    { id: 'sp1', name: 'SLM', jenisSP: 'SP 1', proporsi: 9.24 },
    { id: 'sp2', name: 'ATM/Delivery Channel Depre/Rental', jenisSP: 'SP 2', proporsi: 31.25 },
    { id: 'sp3', name: 'e-Channel Platform (IT Cost)', jenisSP: 'SP 3', proporsi: 11.12 },
    { id: 'sp4a', name: 'Sewa Lokasi', jenisSP: 'SP 4.a', proporsi: 22.30 },
    { id: 'sp4b', name: 'Listrik', jenisSP: 'SP 4.b', proporsi: 6.40 },
    { id: 'sp4c', name: 'Security', jenisSP: 'SP 4.c', proporsi: 3.60 },
    { id: 'sp4d', name: 'Renovation/Space Repair', jenisSP: 'SP 4.d', proporsi: 1.65 },
    { id: 'sp4e', name: 'Cleaning', jenisSP: 'SP 4.e', proporsi: 4.08 },
    { id: 'sp5', name: 'Network', jenisSP: 'SP 5', proporsi: 10.36 },
  ];

  const [transaksiPerHari, setTransaksiPerHari] = useState(100);
  const [hargaLayanan, setHargaLayanan] = useState(1735);
  const [activeSP, setActiveSP] = useState({
    sp1: true, sp2: true, sp3: true, sp4a: true, sp4b: true, 
    sp4c: true, sp4d: true, sp4e: true, sp5: true
  });
  const [driverCost, setDriverCost] = useState({
    slm: '',
    sewaMesin: '',
    itPlatform: '',
    sewaLokasi: '',
    listrik: '',
    slm: 700000,
    sewaMesin: 2500000,
    itPlatform: 500000,
    sewaLokasi: 2050000,
    listrik: 700000,
    cctv: 300000,
    spaceRepair: 100000,
    cleaning: 300000,
    network: 550000
  });
  const [otcNetwork, setOtcNetwork] = useState(500000);

  // Calculate active SP percentage
  const totalActiveSPPercentage = spData
    .filter(sp => activeSP[sp.id])
    .reduce((sum, sp) => sum + sp.proporsi, 0);

  // Calculate Revenue per bulan (transaksi per hari x 30 x SP% x harga)
  const revenuePerHari = transaksiPerHari * (totalActiveSPPercentage / 100) * hargaLayanan;
  const revenuePerBulan = revenuePerHari * 30;

  // Calculate Total Cost (including OTC divided by 12)
  const regularCost = Object.values(driverCost)
    .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const otcPerBulan = (parseFloat(otcNetwork) || 0) / 12;
  const totalCost = regularCost + otcPerBulan;

  // Calculate Profit/Loss (per bulan)
  const profitLoss = revenuePerBulan - totalCost;
  const isProfit = profitLoss >= 0;

  const handleSPToggle = (spId) => {
    setActiveSP(prev => ({ ...prev, [spId]: !prev[spId] }));
  };

  const handleCostChange = (field, value) => {
    setDriverCost(prev => ({ ...prev, [field]: value }));
  };

  const resetCalculator = () => {
    setTransaksiPerHari(100);
    setHargaLayanan(1735);
    setActiveSP({
      sp1: true, sp2: true, sp3: true, sp4a: true, sp4b: true,
      sp4c: true, sp4d: true, sp4e: true, sp5: true
    });
    setDriverCost({
      slm: 700000, sewaMesin: 2500000, itPlatform: 500000, sewaLokasi: 2050000,
      listrik: 700000, cctv: 300000, spaceRepair: 100000, cleaning: 300000, network: 550000
    });
    setOtcNetwork(500000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">🧮 Kalkulator Analisa Transaksi</h2>
        <button onClick={resetCalculator} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
          🔄 Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Basic Inputs */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Input Parameter</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Transaksi per Hari</label>
                <input
                  type="number"
                  value={transaksiPerHari}
                  onChange={(e) => setTransaksiPerHari(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Transaksi per Bulan</label>
                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">
                  {(transaksiPerHari * 30).toLocaleString('id-ID')}
                  <span className="text-xs text-gray-500 ml-2">(per hari × 30)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Layanan (Rp)</label>
                <input
                  type="number"
                  value={hargaLayanan}
                  onChange={(e) => setHargaLayanan(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="1735"
                />
              </div>
            </div>
          </div>

          {/* SP Aktif */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">✅ SP yang Aktif</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 text-left">Aktif</th>
                    <th className="py-2 px-3 text-left">Jenis Layanan</th>
                    <th className="py-2 px-3 text-center">Jenis SP</th>
                    <th className="py-2 px-3 text-right">Proporsi</th>
                  </tr>
                </thead>
                <tbody>
                  {spData.map((sp) => (
                    <tr key={sp.id} className={`border-b ${activeSP[sp.id] ? 'bg-green-50' : 'bg-gray-50 opacity-60'}`}>
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={activeSP[sp.id]}
                          onChange={() => handleSPToggle(sp.id)}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                      </td>
                      <td className="py-2 px-3">{sp.name}</td>
                      <td className="py-2 px-3 text-center font-medium text-blue-600">{sp.jenisSP}</td>
                      <td className="py-2 px-3 text-right font-semibold">{sp.proporsi.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-100 font-bold">
                  <tr>
                    <td colSpan="3" className="py-2 px-3 text-right">Total SP Aktif:</td>
                    <td className="py-2 px-3 text-right text-orange-700">{totalActiveSPPercentage.toFixed(2)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Cost & Result Section */}
        <div className="space-y-6">
          {/* Driver Cost */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Driver Cost (per Bulan)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'slm', label: 'SP 1 - SLM' },
                { key: 'sewaMesin', label: 'SP 2 - Sewa Mesin' },
                { key: 'itPlatform', label: 'SP 3 - IT Platform' },
                { key: 'sewaLokasi', label: 'SP 4.a - Sewa Lokasi' },
                { key: 'listrik', label: 'SP 4.b - Listrik' },
                { key: 'cctv', label: 'SP 4.c - Security/CCTV' },
                { key: 'spaceRepair', label: 'SP 4.d - Space Repair' },
                { key: 'cleaning', label: 'SP 4.e - Cleaning' },
                { key: 'network', label: 'SP 5 - Network' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="number"
                    value={driverCost[key]}
                    onChange={(e) => handleCostChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>
              ))}
              {/* OTC Network */}
              <div className="sm:col-span-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <label className="block text-xs font-medium text-yellow-800 mb-1">SP 5 - OTC Network (One Time Charge / Tahun)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={otcNetwork}
                    onChange={(e) => setOtcNetwork(e.target.value)}
                    className="flex-1 px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500"
                    placeholder="500000"
                  />
                  <span className="text-xs text-yellow-700 whitespace-nowrap">÷ 12 = Rp {Math.round(otcNetwork / 12).toLocaleString('id-ID')}/bln</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Biaya Reguler:</span>
                <span className="font-medium">Rp {regularCost.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">OTC (per bulan):</span>
                <span className="font-medium">Rp {Math.round(otcPerBulan).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium text-gray-700">Total Cost:</span>
                <span className="text-xl font-bold text-red-600">Rp {Math.round(totalCost).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-4">📈 Hasil Perhitungan (per Bulan)</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Transaksi per Hari:</span>
                <span className="font-semibold">{transaksiPerHari.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Transaksi per Bulan:</span>
                <span className="font-semibold">{(transaksiPerHari * 30).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">SP Aktif:</span>
                <span className="font-semibold">{totalActiveSPPercentage.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-600">
                <span className="text-gray-300">Harga Layanan:</span>
                <span className="font-semibold">Rp {hargaLayanan.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="bg-blue-600 rounded-lg p-4 mb-4">
              <div className="text-blue-100 text-sm mb-1">Revenue per Bulan</div>
              <div className="text-sm text-blue-200 mb-2">
                = {transaksiPerHari.toLocaleString('id-ID')} × 30 hari × {totalActiveSPPercentage.toFixed(2)}% × Rp {hargaLayanan.toLocaleString('id-ID')}
              </div>
              <div className="text-2xl font-bold">Rp {Math.round(revenuePerBulan).toLocaleString('id-ID')}</div>
            </div>

            <div className="bg-gray-600 rounded-lg p-4 mb-4">
              <div className="text-gray-100 text-sm mb-1">Total Cost per Bulan</div>
              <div className="text-sm text-gray-300 mb-2">
                = Biaya Reguler + (OTC ÷ 12)
              </div>
              <div className="text-2xl font-bold">Rp {Math.round(totalCost).toLocaleString('id-ID')}</div>
            </div>

            <div className={`rounded-lg p-4 ${isProfit ? 'bg-green-600' : 'bg-red-600'}`}>
              <div className={`text-sm mb-1 ${isProfit ? 'text-green-100' : 'text-red-100'}`}>
                {isProfit ? '✅ UNTUNG' : '❌ RUGI'} (per Bulan)
              </div>
              <div className="text-sm mb-2 opacity-80">
                = Revenue - Cost = Rp {Math.round(revenuePerBulan).toLocaleString('id-ID')} - Rp {Math.round(totalCost).toLocaleString('id-ID')}
              </div>
              <div className="text-3xl font-bold">
                {isProfit ? '+' : '-'} Rp {Math.abs(Math.round(profitLoss)).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// Report Selector Component
const ReportSelector = ({ reports, selectedReport, onSelectReport }) => {
  if (!reports || reports.length === 0) return null;
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Laporan:</label>
      <select value={selectedReport || ''} onChange={(e) => onSelectReport(e.target.value || null)}
        className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg">
        <option value="">-- Data Awal (25-12-2025) --</option>
        {reports.map((report) => (
          <option key={report.id} value={report.id}>{report.data_date || '-'} | {report.period} - {report.filename}</option>
        ))}
      </select>
    </div>
  );
};

function App() {
  const [summary, setSummary] = useState(null);
  const [bankSummary, setBankSummary] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
  const [deleting, setDeleting] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const fetchAvailableDates = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/available-dates`);
      setAvailableDates(response.data.dates || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reports`);
      setReports(response.data.reports || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedReport) params.append('report_id', selectedReport);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const response = await axios.get(`${API}/report/summary?${params}`);
      setSummary(response.data);
    } catch (e) { setError('Gagal memuat data.'); }
  }, [selectedReport, dateFrom, dateTo]);

  const fetchBankSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const response = await axios.get(`${API}/report/summary-by-bank?${params}`);
      setBankSummary(response.data.data || []);
    } catch (e) { console.error(e); }
  }, [dateFrom, dateTo]);

  const fetchDetailTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 100, search: detailSearchTerm, status_filter: statusFilter });
      if (selectedReport) params.append('report_id', selectedReport);
      const response = await axios.get(`${API}/report/transactions-detail?${params}`);
      setDetailTransactions(response.data.data || []);
      setTotalPages(response.data.pages || 1);
      setTotalTransactions(response.data.total || 0);
    } catch (e) { console.error(e); }
  }, [currentPage, detailSearchTerm, statusFilter, selectedReport]);

  const fetchTerminalSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ search: terminalSearchTerm });
      if (selectedReport) params.append('report_id', selectedReport);
      const response = await axios.get(`${API}/report/terminal-summary?${params}`);
      setTerminalSummary(response.data.data || []);
    } catch (e) { console.error(e); }
  }, [terminalSearchTerm, selectedReport]);

  const initializeData = async () => {
    setInitializing(true);
    try {
      await axios.post(`${API}/init-data`);
      await fetchReports();
      await fetchAvailableDates();
      await fetchSummary();
      await fetchBankSummary();
      await fetchDetailTransactions();
      await fetchTerminalSummary();
    } catch (e) { console.error(e); }
    finally { setInitializing(false); }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchReports();
      await fetchAvailableDates();
      await fetchSummary();
      await fetchBankSummary();
      await fetchDetailTransactions();
      await fetchTerminalSummary();
      setLoading(false);
    };
    loadData();
  }, [fetchReports, fetchAvailableDates, fetchSummary, fetchBankSummary, fetchDetailTransactions, fetchTerminalSummary]);

  useEffect(() => { if (!loading) { fetchSummary(); fetchBankSummary(); fetchDetailTransactions(); fetchTerminalSummary(); } }, [selectedReport, fetchSummary, fetchBankSummary, fetchDetailTransactions, fetchTerminalSummary, loading]);
  useEffect(() => { if (!loading) { fetchSummary(); fetchBankSummary(); } }, [dateFrom, dateTo, fetchSummary, fetchBankSummary, loading]);
  useEffect(() => { if (!loading) { setCurrentPage(1); fetchDetailTransactions(); } }, [detailSearchTerm, statusFilter, fetchDetailTransactions, loading]);
  useEffect(() => { if (!loading) { fetchDetailTransactions(); } }, [currentPage, fetchDetailTransactions, loading]);
  useEffect(() => { if (!loading) { fetchTerminalSummary(); } }, [terminalSearchTerm, fetchTerminalSummary, loading]);

  const handleUploadSuccess = (reportId) => { fetchReports(); fetchAvailableDates(); setSelectedReport(reportId); };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Yakin ingin menghapus laporan ini? Data transaksi terkait juga akan dihapus.')) return;
    
    setDeleting(reportId);
    try {
      await axios.delete(`${API}/report/${reportId}`);
      // Clear selection if deleted report was selected
      if (selectedReport === reportId) {
        setSelectedReport(null);
      }
      // Refresh data
      await fetchReports();
      await fetchSummary();
      await fetchDetailTransactions();
      await fetchTerminalSummary();
    } catch (e) {
      console.error('Failed to delete report:', e);
      alert('Gagal menghapus laporan');
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm('⚠️ PERINGATAN: Semua data laporan dan transaksi akan dihapus permanen!\n\nYakin ingin melanjutkan?')) return;
    if (!window.confirm('Konfirmasi sekali lagi: Hapus SEMUA data?')) return;
    
    setClearingAll(true);
    try {
      await axios.delete(`${API}/reports/clear-all`);
      setSelectedReport(null);
      setDateFrom('');
      setDateTo('');
      setReports([]);
      setBankSummary([]);
      setAvailableDates([]);
      // Refresh all data
      await fetchReports();
      await fetchAvailableDates();
      await fetchSummary();
      await fetchBankSummary();
      await fetchDetailTransactions();
      await fetchTerminalSummary();
      alert('Semua data berhasil dihapus');
    } catch (e) {
      console.error('Failed to clear all data:', e);
      alert('Gagal menghapus semua data');
    } finally {
      setClearingAll(false);
    }
  };

  const handleExportDetailCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ search: detailSearchTerm, status_filter: statusFilter });
      if (selectedReport) params.append('report_id', selectedReport);
      const response = await axios.get(`${API}/report/transactions-detail/export?${params}`);
      const columns = [{ key: 'data_date', label: 'Tanggal' }, { key: 'bank', label: 'Bank' }, { key: 'terminal_id', label: 'Terminal ID' }, { key: 'terminal_location', label: 'Lokasi' }, { key: 'status', label: 'Status' }];
      exportToCSV(response.data.data, `detail_transaksi`, columns);
    } catch (e) { console.error(e); } finally { setExporting(false); }
  };

  const handleExportDetailExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ search: detailSearchTerm, status_filter: statusFilter });
      if (selectedReport) params.append('report_id', selectedReport);
      const response = await axios.get(`${API}/report/transactions-detail/export?${params}`);
      const columns = [{ key: 'data_date', label: 'Tanggal' }, { key: 'bank', label: 'Bank' }, { key: 'terminal_id', label: 'Terminal ID' }, { key: 'terminal_location', label: 'Lokasi' }, { key: 'status', label: 'Status' }];
      exportToExcel(response.data.data, `detail_transaksi`, columns);
    } catch (e) { console.error(e); } finally { setExporting(false); }
  };

  const handleExportTerminalCSV = () => {
    const columns = [{ key: 'bank', label: 'Bank' }, { key: 'terminal_id', label: 'Terminal ID' }, { key: 'terminal_location', label: 'Lokasi' }, { key: 'total_transaksi', label: 'Total' }, { key: 'sukses', label: 'Sukses' }, { key: 'gagal', label: 'Gagal' }, { key: 'success_rate', label: 'Success Rate' }];
    exportToCSV(terminalSummary, `ringkasan_terminal`, columns);
  };

  const handleExportTerminalExcel = () => {
    const columns = [{ key: 'bank', label: 'Bank' }, { key: 'terminal_id', label: 'Terminal ID' }, { key: 'terminal_location', label: 'Lokasi' }, { key: 'total_transaksi', label: 'Total' }, { key: 'sukses', label: 'Sukses' }, { key: 'gagal', label: 'Gagal' }, { key: 'success_rate', label: 'Success Rate' }];
    exportToExcel(terminalSummary, `ringkasan_terminal`, columns);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">📊 Laporan REPAY ATM</h1>
              <p className="text-gray-500 mt-1">Bank {summary?.bank_code} | Periode: {summary?.period}</p>
            </div>
            <div className="bg-blue-100 px-4 py-2 rounded-lg">
              <span className="text-blue-800 font-semibold">{formatNumber(summary?.total_terminals || 0)} Terminal</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-xl shadow-md p-2 inline-flex gap-1 flex-wrap">
          {['overview', 'detail', 'terminal', 'top', 'bottom', 'upload', 'aktivasi', 'kalkulator'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab 
                  ? tab === 'aktivasi' ? 'bg-teal-600 text-white shadow' 
                  : tab === 'upload' ? 'bg-green-600 text-white shadow' 
                  : tab === 'kalkulator' ? 'bg-orange-600 text-white shadow'
                  : 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {tab === 'overview' && '📈 Overview'}
              {tab === 'detail' && '📋 Detail'}
              {tab === 'terminal' && '🏧 Terminal'}
              {tab === 'top' && '🏆 Top'}
              {tab === 'bottom' && '📉 Bottom'}
              {tab === 'upload' && '📤 Upload'}
              {tab === 'aktivasi' && '🆕 ATM Aktivasi'}
              {tab === 'kalkulator' && '🧮 Kalkulator'}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!['upload', 'aktivasi', 'kalkulator'].includes(activeTab) && (
          <ReportSelector reports={reports} selectedReport={selectedReport} onSelectReport={setSelectedReport} />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Filter Tanggal Range */}
            <section className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-medium text-gray-700">📅 Filter Tanggal:</span>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Dari:</label>
                  <select 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih --</option>
                    {availableDates.map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Sampai:</label>
                  <select 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih --</option>
                    {availableDates.map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
                {(dateFrom || dateTo) && (
                  <button 
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    ✕ Reset Filter
                  </button>
                )}
                {summary?.total_terminals === 0 && (
                  <button
                    onClick={initializeData}
                    disabled={initializing}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      initializing ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {initializing ? '⏳ Memuat...' : '📥 Muat Data Awal'}
                  </button>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Ringkasan Transaksi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Sukses" value={formatNumber(summary?.total_transaksi_sukses || 0)} icon="✅" color="border-green-500" />
                <StatCard title="Gagal Bank" value={formatNumber(summary?.total_gagal_sistem_bank || 0)} icon="🏦" color="border-red-500" />
                <StatCard title="Gagal Nasabah" value={formatNumber(summary?.total_gagal_nasabah || 0)} icon="👤" color="border-orange-500" />
                <StatCard title="Gagal Jalin" value={formatNumber(summary?.total_gagal_sistem_jalin || 0)} icon="🔗" color="border-yellow-500" />
              </div>
            </section>

            {/* Ringkasan per Bank */}
            {bankSummary.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4">🏦 Ringkasan Transaksi per Bank</h2>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                      <tr>
                        <th className="py-3 px-4 text-left">Bank</th>
                        <th className="py-3 px-4 text-right">Terminal</th>
                        <th className="py-3 px-4 text-right">Total Transaksi</th>
                        <th className="py-3 px-4 text-right">Sukses</th>
                        <th className="py-3 px-4 text-right">Gagal</th>
                        <th className="py-3 px-4 text-right">Success Rate</th>
                        <th className="py-3 px-4 text-right">Total Repay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankSummary.map((bank, idx) => (
                        <tr key={bank.bank} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="py-3 px-4"><BankBadge bank={bank.bank} /></td>
                          <td className="py-3 px-4 text-right font-medium">{formatNumber(bank.total_terminals)}</td>
                          <td className="py-3 px-4 text-right font-semibold">{formatNumber(bank.total_transaksi)}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-semibold">{formatNumber(bank.total_sukses)}</td>
                          <td className="py-3 px-4 text-right text-red-500">{formatNumber(bank.total_gagal)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              bank.success_rate >= 90 ? 'bg-green-100 text-green-700' :
                              bank.success_rate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {bank.success_rate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-blue-600 font-semibold">{formatRupiah(bank.total_repay_nominal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Ringkasan Keuangan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                  <p className="text-blue-100 text-sm uppercase">Total Ditagihkan</p>
                  <p className="text-3xl font-bold mt-2">{formatNumber(summary?.total_transaksi_ditagihkan || 0)}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                  <p className="text-purple-100 text-sm uppercase">Total Biaya Gross</p>
                  <p className="text-3xl font-bold mt-2">{formatRupiah(summary?.total_biaya_gross || 0)}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                  <p className="text-green-100 text-sm uppercase">Total Repay</p>
                  <p className="text-3xl font-bold mt-2">{formatRupiah(summary?.total_repay_nominal || 0)}</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'detail' && (
          <section>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
              <h2 className="text-xl font-bold text-gray-800">📋 Detail Transaksi ({formatNumber(totalTransactions)})</h2>
              <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="Cari..." value={detailSearchTerm} onChange={(e) => setDetailSearchTerm(e.target.value)}
                  className="px-4 py-2 border rounded-lg w-48" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
                  <option value="">Semua Status</option>
                  <option value="Sukses">✅ Sukses</option>
                  <option value="Gagal Sistem Bank">🏦 Gagal Bank</option>
                  <option value="Gagal Nasabah">👤 Gagal Nasabah</option>
                </select>
                <ExportButtons onExportCSV={handleExportDetailCSV} onExportExcel={handleExportDetailExcel} disabled={exporting} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-3 text-left">Tanggal</th>
                    <th className="py-3 px-3 text-left">Bank</th>
                    <th className="py-3 px-3 text-left">Terminal ID</th>
                    <th className="py-3 px-3 text-left">Lokasi</th>
                    <th className="py-3 px-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTransactions.map((t, idx) => <DetailTransactionRow key={idx} data={t} index={(currentPage - 1) * 100 + idx} />)}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg ${currentPage === 1 ? 'bg-gray-200' : 'bg-blue-600 text-white'}`}>← Prev</button>
                <span className="px-4 py-2 bg-white rounded-lg shadow">Hal {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg ${currentPage === totalPages ? 'bg-gray-200' : 'bg-blue-600 text-white'}`}>Next →</button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'terminal' && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h2 className="text-xl font-bold text-gray-800">🏧 Ringkasan Terminal ({formatNumber(terminalSummary.length)})</h2>
              <div className="flex gap-3 items-center">
                <input type="text" placeholder="Cari..." value={terminalSearchTerm} onChange={(e) => setTerminalSearchTerm(e.target.value)}
                  className="px-4 py-2 border rounded-lg w-48" />
                <ExportButtons onExportCSV={handleExportTerminalCSV} onExportExcel={handleExportTerminalExcel} disabled={terminalSummary.length === 0} />
              </div>
            </div>
            
            {/* Legend/Keterangan Warna */}
            <div className="bg-white rounded-lg shadow p-3 mb-4 flex flex-wrap gap-4 items-center">
              <span className="font-medium text-gray-700 text-sm">Keterangan Total Transaksi:</span>
              <div className="flex flex-wrap gap-3">
                <span className="flex items-center gap-1 text-xs">
                  <span className="w-4 h-4 rounded-full bg-green-500"></span>
                  <span>≥100 (Hijau)</span>
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                  <span>75-99 (Biru)</span>
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <span className="w-4 h-4 rounded-full bg-yellow-400"></span>
                  <span>60-74 (Kuning)</span>
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <span className="w-4 h-4 rounded-full bg-red-500"></span>
                  <span>&lt;60 (Merah)</span>
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-3 text-left">Bank</th>
                    <th className="py-3 px-3 text-left">Terminal ID</th>
                    <th className="py-3 px-3 text-left">Lokasi</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3 text-right">Sukses</th>
                    <th className="py-3 px-3 text-right">Gagal</th>
                    <th className="py-3 px-3 text-right">Rate</th>
                    <th className="py-3 px-3 text-right">Biaya Gross</th>
                    <th className="py-3 px-3 text-right">Proporsi</th>
                    <th className="py-3 px-3 text-right">Repay</th>
                  </tr>
                </thead>
                <tbody>
                  {terminalSummary.map((t, idx) => <TerminalSummaryRow key={t.terminal_id} data={t} index={idx} />)}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'top' && (
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 10 Terminal</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <tr>
                    <th className="py-4 px-4 text-center">Rank</th>
                    <th className="py-4 px-4 text-left">Bank</th>
                    <th className="py-4 px-4 text-left">Terminal ID</th>
                    <th className="py-4 px-4 text-left">Lokasi</th>
                    <th className="py-4 px-4 text-right">Sukses</th>
                    <th className="py-4 px-4 text-right">Repay</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.top_terminals?.map((t, idx) => (
                    <tr key={t.terminal_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-center">{idx + 1}</td>
                      <td className="py-3 px-4"><BankBadge bank={t.bank} /></td>
                      <td className="py-3 px-4 font-medium text-blue-600">{t.terminal_id}</td>
                      <td className="py-3 px-4">{t.terminal_location}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-semibold">{formatNumber(t.sukses)}</td>
                      <td className="py-3 px-4 text-right text-blue-600">{formatRupiah(t.repay_nominal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'bottom' && (
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">📉 Bottom 10 Terminal</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <tr>
                    <th className="py-4 px-4 text-center">Rank</th>
                    <th className="py-4 px-4 text-left">Bank</th>
                    <th className="py-4 px-4 text-left">Terminal ID</th>
                    <th className="py-4 px-4 text-left">Lokasi</th>
                    <th className="py-4 px-4 text-right">Sukses</th>
                    <th className="py-4 px-4 text-right">Repay</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.bottom_terminals?.map((t, idx) => (
                    <tr key={t.terminal_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-center">{idx + 1}</td>
                      <td className="py-3 px-4"><BankBadge bank={t.bank} /></td>
                      <td className="py-3 px-4 font-medium text-blue-600">{t.terminal_id}</td>
                      <td className="py-3 px-4">{t.terminal_location}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-semibold">{formatNumber(t.sukses)}</td>
                      <td className="py-3 px-4 text-right text-blue-600">{formatRupiah(t.repay_nominal)}</td>
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
            
            {/* Tombol Hapus Semua Data - selalu tampil */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-red-800">🗑️ Manajemen Data</h4>
                  <p className="text-sm text-red-600">Hapus semua data laporan dan transaksi dari database</p>
                </div>
                <button
                  onClick={handleClearAllData}
                  disabled={clearingAll}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                    clearingAll ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                  data-testid="clear-all-data-btn"
                >
                  {clearingAll ? '⏳ Menghapus...' : '🗑️ Hapus Semua Data'}
                </button>
              </div>
            </div>

            {reports.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📁 Laporan Diupload ({reports.length})</h3>
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold">📅 {r.data_date || '-'}</p>
                        <p className="text-sm text-gray-600">{r.period} - {r.filename}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-sm">{formatNumber(r.total_terminals)} Terminal</p>
                        <p className="text-sm text-green-600">{formatNumber(r.total_transaksi_sukses)} Sukses</p>
                      </div>
                      <button
                        onClick={() => handleDeleteReport(r.id)}
                        disabled={deleting === r.id}
                        className={`p-2 rounded-lg transition-colors ${
                          deleting === r.id ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title="Hapus Laporan"
                        data-testid={`delete-report-${r.id}`}
                      >
                        {deleting === r.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'aktivasi' && <ATMActivationTab />}

        {activeTab === 'kalkulator' && <Calculator />}
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500">
          <p>Laporan REPAY ATM Platform | Bank {summary?.bank_code}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
