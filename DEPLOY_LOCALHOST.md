# 📊 Laporan REPAY ATM - Panduan Deploy Localhost

## Prasyarat

Pastikan Anda sudah menginstall:
- **Node.js** (v18+) - https://nodejs.org/
- **Python** (v3.9+) - https://python.org/
- **MongoDB** (v6+) - https://mongodb.com/

## Struktur Folder

```
project/
├── backend/
│   ├── server.py          # FastAPI server
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Backend environment
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   └── App.css        # Styles
│   ├── package.json       # Node dependencies
│   └── .env               # Frontend environment
└── DEPLOY_LOCALHOST.md    # This file
```

## Langkah Deploy

### 1️⃣ Setup MongoDB

Jalankan MongoDB di local:
```bash
# Jika menggunakan brew (macOS)
brew services start mongodb-community

# Jika menggunakan systemd (Linux)
sudo systemctl start mongod

# Atau jalankan langsung
mongod --dbpath /path/to/data
```

MongoDB akan berjalan di `mongodb://localhost:27017`

### 2️⃣ Setup Backend

```bash
# Masuk ke folder backend
cd backend

# Buat virtual environment (opsional tapi disarankan)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# atau
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Buat file .env
cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="repay_atm_db"
CORS_ORIGINS="http://localhost:3000"
EOF

# Jalankan backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend akan berjalan di `http://localhost:8001`

### 3️⃣ Setup Frontend

Buka terminal baru:

```bash
# Masuk ke folder frontend
cd frontend

# Install dependencies (gunakan yarn atau npm)
yarn install
# atau
npm install

# Buat file .env
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Jalankan frontend
yarn start
# atau
npm start
```

Frontend akan berjalan di `http://localhost:3000`

## 📁 File requirements.txt (Backend)

```
fastapi==0.109.0
uvicorn==0.27.0
motor==3.3.2
python-dotenv==1.0.0
pydantic==2.5.3
python-multipart==0.0.6
```

## 📁 File package.json Dependencies (Frontend)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.0",
    "react-router-dom": "^6.21.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

## 🔧 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/report/summary` | Dapatkan ringkasan laporan |
| GET | `/api/report/transactions` | Dapatkan semua transaksi |
| GET | `/api/reports` | Dapatkan daftar laporan yang diupload |
| POST | `/api/report/upload` | Upload file laporan baru |
| DELETE | `/api/report/{report_id}` | Hapus laporan |

## 📤 Cara Upload File

1. Buka tab "Upload" di aplikasi
2. Pilih file laporan (.txt atau .csv)
3. Masukkan periode (opsional, misal: "Januari 2026")
4. Klik "Upload File"

File yang diupload akan:
- Disimpan di database MongoDB
- Dapat dipilih dari dropdown "Pilih Laporan"
- Ditampilkan per tanggal upload

## 🐛 Troubleshooting

### MongoDB tidak bisa connect
```bash
# Cek apakah MongoDB berjalan
mongosh
# atau
mongo
```

### Port sudah digunakan
```bash
# Ganti port backend
uvicorn server:app --reload --port 8002

# Update .env frontend
REACT_APP_BACKEND_URL=http://localhost:8002
```

### CORS Error
Pastikan `CORS_ORIGINS` di backend .env sesuai dengan URL frontend.

## 📞 Support

Jika ada pertanyaan atau masalah, silakan hubungi tim pengembang.
