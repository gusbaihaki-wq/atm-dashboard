# Laporan REPAY ATM Dashboard - Product Requirements Document

## Original Problem Statement
User meminta aplikasi dashboard untuk mengelola laporan transaksi ATM REPAY dengan fitur:
1. Upload file laporan transaksi (.txt, .csv)
2. Overview summary (total transaksi, success rate, top/bottom terminal)
3. Detail transaksi dengan pagination, filter, dan sorting
4. Ringkasan per terminal dengan search
5. Export data ke CSV dan Excel
6. Kolom Bank berdasarkan prefix Terminal ID
7. Tab ATM Aktivasi untuk CRUD data aktivasi ATM
8. Panduan setup untuk localhost
9. Fitur hapus laporan individual dan hapus semua data

## User Persona
- Admin/Staff Bank yang mengelola laporan transaksi ATM
- Membutuhkan visualisasi data transaksi harian
- Perlu export data untuk reporting

## Tech Stack
- **Frontend:** React, TailwindCSS, Axios
- **Backend:** FastAPI, Motor (async MongoDB driver), Pydantic
- **Database:** MongoDB

## Core Features (Implemented)

### 1. Dashboard Overview ✅
- Total transaksi sukses, gagal bank, gagal nasabah, gagal jalin
- Total ditagihkan, biaya gross, repay nominal
- Top 10 dan Bottom 10 terminal

### 2. Detail Transaksi ✅
- Tabel paginated (100 per halaman)
- Search by terminal ID/lokasi
- Filter by status
- Export CSV/Excel

### 3. Ringkasan Terminal ✅
- Summary per terminal (total, sukses, gagal, success rate)
- Search functionality
- Export CSV/Excel

### 4. Upload File ✅
- Upload .txt/.csv files
- Input tanggal data
- Input periode (optional)
- Auto-parsing data transaksi

### 5. ATM Aktivasi (CRUD) ✅
- List dengan pagination dan search
- Create new activation
- Edit activation
- Delete activation
- Upload bulk data
- Export CSV/Excel
- Clear all activation data

### 6. Hapus Data ✅ (Implemented: 13 Jan 2026)
- Hapus laporan individual dengan konfirmasi
- Hapus semua data dengan double konfirmasi
- Tombol "Muat Data Awal" untuk inisialisasi data awal ke database

### 7. Bank Detection ✅
- T02 = Mandiri
- T08 = BNI
- T09 = BNI
- T20 = BTN
- Others = BRI

### 8. Filter Tanggal di Overview ✅ (Implemented: 13 Jan 2026)
- Dropdown pilihan tanggal (default: Semua Tanggal)
- Data terfilter sesuai tanggal yang dipilih

### 9. Ringkasan Transaksi per Bank ✅ (Implemented: 13 Jan 2026)
- Tabel ringkasan transaksi per bank (Mandiri, BNI, BRI, BTN)
- Menampilkan: Terminal, Total Transaksi, Sukses, Gagal, Success Rate, Total Repay

### 10. Indikator Warna Terminal ✅ (Implemented: 13 Jan 2026)
- ≥100 transaksi: Hijau
- 75-99 transaksi: Biru
- 60-74 transaksi: Kuning
- <60 transaksi: Merah

## API Endpoints

### Reports
- `GET /api/reports` - List all reports
- `GET /api/report/summary` - Get summary
- `GET /api/report/transactions-detail` - Get paginated transactions
- `GET /api/report/terminal-summary` - Get terminal summary
- `POST /api/report/upload` - Upload report file
- `DELETE /api/report/{report_id}` - Delete individual report
- `DELETE /api/reports/clear-all` - Clear all reports

### ATM Activation
- `GET /api/atm-activation` - List activations
- `POST /api/atm-activation` - Create activation
- `PUT /api/atm-activation/{id}` - Update activation
- `DELETE /api/atm-activation/{id}` - Delete activation
- `POST /api/atm-activation/upload` - Upload bulk
- `GET /api/atm-activation/export` - Export data
- `DELETE /api/atm-activation/clear-all` - Clear all

## Database Collections
- `reports` - Metadata laporan
- `transactions` - Data transaksi individual
- `atm_activations` - Data aktivasi ATM

## Files Structure
```
/app/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   └── src/App.js
├── tests/
│   └── test_atm_dashboard.py
└── PANDUAN_LOCALHOST.md
```

## Completed Work Log
| Date | Feature |
|------|---------|
| - | Initial dashboard with overview, detail, terminal summary |
| - | File upload functionality |
| - | ATM Aktivasi CRUD |
| - | Export CSV/Excel |
| 13 Jan 2026 | Fitur hapus laporan individual dan hapus semua data |

## Prioritized Backlog
- P2: Refactor App.js menjadi komponen terpisah
- P2: Refactor server.py menggunakan APIRouter per module
- P3: Improve file parsing untuk format yang lebih beragam

## Testing
- Backend: 16 tests, 100% passed
- Frontend: All tabs and features verified
- Test file: `/app/tests/test_atm_dashboard.py`
