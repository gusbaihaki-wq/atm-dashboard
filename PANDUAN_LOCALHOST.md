# 🚀 Panduan Deploy di Localhost

## Langkah 1: Persiapan (Install Software yang Dibutuhkan)

### A. Install Python 3.9+
**Windows:**
1. Download dari https://www.python.org/downloads/
2. Jalankan installer, **CENTANG** "Add Python to PATH"
3. Klik "Install Now"

**Mac:**
```bash
brew install python
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

### B. Install Node.js 18+
**Windows/Mac:**
1. Download dari https://nodejs.org/
2. Pilih versi LTS
3. Jalankan installer

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs
```

### C. Install MongoDB
**Windows:**
1. Download dari https://www.mongodb.com/try/download/community
2. Jalankan installer
3. Pilih "Complete" installation
4. Centang "Install MongoDB as a Service"

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## Langkah 2: Download/Buat Struktur Folder

Buat folder project dengan struktur berikut:

```
repay-atm-app/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   └── index.js
    ├── public/
    │   └── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── .env
```

---

## Langkah 3: Setup Backend

### 3.1 Buka Terminal/Command Prompt, masuk ke folder backend:
```bash
cd repay-atm-app/backend
```

### 3.2 Buat file `requirements.txt`:
```
fastapi==0.109.0
uvicorn==0.27.0
motor==3.3.2
python-dotenv==1.0.0
pydantic==2.5.3
python-multipart==0.0.6
```

### 3.3 Buat file `.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=repay_atm_db
CORS_ORIGINS=http://localhost:3000
```

### 3.4 Buat Virtual Environment dan Install Dependencies:

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3.5 Copy file `server.py` dari aplikasi ini

### 3.6 Jalankan Backend:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

✅ Backend berjalan di: `http://localhost:8001`

---

## Langkah 4: Setup Frontend

### 4.1 Buka Terminal BARU, masuk ke folder frontend:
```bash
cd repay-atm-app/frontend
```

### 4.2 Buat file `package.json`:
```json
{
  "name": "repay-atm-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
```

### 4.3 Buat file `.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4.4 Buat file `tailwind.config.js`:
```javascript
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 4.5 Buat file `postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 4.6 Buat folder `public/` dan file `public/index.html`:
```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Laporan REPAY ATM</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

### 4.7 Buat folder `src/` dan file `src/index.js`:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 4.8 Buat file `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4.9 Copy file `src/App.js` dan `src/App.css` dari aplikasi ini

### 4.10 Install Dependencies:
```bash
npm install
```

### 4.11 Jalankan Frontend:
```bash
npm start
```

✅ Frontend berjalan di: `http://localhost:3000`

---

## Langkah 5: Buka Aplikasi

1. Pastikan MongoDB sudah berjalan
2. Pastikan Backend sudah berjalan (Terminal 1)
3. Pastikan Frontend sudah berjalan (Terminal 2)
4. Buka browser, akses: **http://localhost:3000**

---

## 🎉 Selesai!

Aplikasi Anda sekarang berjalan di localhost dengan fitur:
- 📈 Overview - Ringkasan transaksi & keuangan
- 📋 Detail Transaksi - Semua transaksi individual
- 🏧 Ringkasan Terminal - Summary per terminal
- 🏆 Top/Bottom Terminal - Ranking terminal
- 📤 Upload - Upload file laporan REPAY
- 🆕 ATM Aktivasi - Kelola data aktivasi ATM

---

## ❓ Troubleshooting

### MongoDB tidak bisa connect
```bash
# Windows - jalankan service
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Port sudah digunakan
```bash
# Ganti port backend (misal 8002)
uvicorn server:app --reload --port 8002

# Update .env frontend
REACT_APP_BACKEND_URL=http://localhost:8002
```

### Error CORS
Pastikan `CORS_ORIGINS` di backend `.env` sesuai dengan URL frontend.

### Module not found di Python
```bash
pip install <nama-module>
```

### Module not found di Node
```bash
npm install
```
