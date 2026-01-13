from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ATMTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    report_id: str
    no: int
    channel_type: str
    terminal_id: str
    terminal_location: str
    sukses: int
    gagal_sistem_bank: int
    gagal_nasabah: int
    gagal_sistem_jalin: int
    total_transaksi_ditagihkan: int
    biaya_gross: float
    proporsi_repay: float
    repay_nominal: float

class ReportMeta(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    period: str
    bank_code: str
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_terminals: int
    total_transaksi_sukses: int
    total_repay_nominal: float

class ReportSummary(BaseModel):
    total_terminals: int
    total_transaksi_sukses: int
    total_gagal_sistem_bank: int
    total_gagal_nasabah: int
    total_gagal_sistem_jalin: int
    total_transaksi_ditagihkan: int
    total_biaya_gross: float
    total_repay_nominal: float
    avg_proporsi_repay: float
    top_terminals: List[dict]
    bottom_terminals: List[dict]
    proporsi_distribution: dict
    period: str
    bank_code: str
    report_id: Optional[str] = None


def parse_number(value: str) -> int:
    """Parse number from string, handling comma as thousand separator"""
    if not value:
        return 0
    # Remove commas and convert to int
    cleaned = value.replace(',', '').replace('.', '').strip()
    try:
        return int(cleaned)
    except:
        return 0

def parse_float(value: str) -> float:
    """Parse float from string"""
    if not value:
        return 0.0
    # Handle Indonesian number format (dot as thousand, comma as decimal)
    cleaned = value.replace('.', '').replace(',', '.').strip()
    try:
        return float(cleaned)
    except:
        return 0.0

def parse_report_file(content: str) -> tuple:
    """Parse report file content and extract transactions"""
    lines = content.split('\n')
    transactions = []
    period = "Unknown"
    bank_code = "Unknown"
    
    # Try to extract period and bank code from header
    for line in lines[:20]:
        if 'Desember' in line or 'Januari' in line or 'Februari' in line or 'Maret' in line or \
           'April' in line or 'Mei' in line or 'Juni' in line or 'Juli' in line or \
           'Agustus' in line or 'September' in line or 'Oktober' in line or 'November' in line:
            # Extract month and year
            match = re.search(r'(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s*(\d{4})', line)
            if match:
                period = f"{match.group(1)} {match.group(2)}"
        if '008' in line and 'MDR' in line:
            bank_code = "008 - MDR"
    
    # Parse transaction data - look for lines with ATM data
    current_no = 0
    for line in lines:
        # Skip empty lines and headers
        if not line.strip():
            continue
        
        # Try to parse as transaction line
        # Format: No | Channel | Terminal ID | Location | Sukses | Gagal Bank | Gagal Nasabah | Gagal Jalin | Total | Biaya | Proporsi | Repay
        parts = line.split('\t')
        if len(parts) < 10:
            parts = re.split(r'\s{2,}|\|', line)
        
        if len(parts) >= 10:
            try:
                # Check if first part is a number (row number)
                no = int(parts[0].strip())
                if no > 0:
                    # Find ATM in parts
                    atm_idx = -1
                    for i, p in enumerate(parts):
                        if 'ATM' in p.upper():
                            atm_idx = i
                            break
                    
                    if atm_idx >= 0:
                        transaction = {
                            'no': no,
                            'channel_type': 'ATM',
                            'terminal_id': parts[atm_idx + 1].strip() if atm_idx + 1 < len(parts) else '',
                            'terminal_location': parts[atm_idx + 2].strip() if atm_idx + 2 < len(parts) else '',
                            'sukses': parse_number(parts[atm_idx + 3]) if atm_idx + 3 < len(parts) else 0,
                            'gagal_sistem_bank': parse_number(parts[atm_idx + 4]) if atm_idx + 4 < len(parts) else 0,
                            'gagal_nasabah': parse_number(parts[atm_idx + 5]) if atm_idx + 5 < len(parts) else 0,
                            'gagal_sistem_jalin': parse_number(parts[atm_idx + 6]) if atm_idx + 6 < len(parts) else 0,
                            'total_transaksi_ditagihkan': parse_number(parts[atm_idx + 7]) if atm_idx + 7 < len(parts) else 0,
                            'biaya_gross': parse_float(parts[atm_idx + 8]) if atm_idx + 8 < len(parts) else 0,
                            'proporsi_repay': parse_float(parts[atm_idx + 9]) if atm_idx + 9 < len(parts) else 0,
                            'repay_nominal': parse_float(parts[atm_idx + 10]) if atm_idx + 10 < len(parts) else 0,
                        }
                        if transaction['terminal_id']:
                            transactions.append(transaction)
            except (ValueError, IndexError):
                continue
    
    return transactions, period, bank_code


# Sample data from the report (initial data)
INITIAL_REPORT_DATA = [
    {"no": 1, "channel_type": "ATM", "terminal_id": "T0901906", "terminal_location": "KAMPUS YAYASAN DEL", "sukses": 37, "gagal_sistem_bank": 0, "gagal_nasabah": 9, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 37, "biaya_gross": 64195, "proporsi_repay": 45.34, "repay_nominal": 29106},
    {"no": 2, "channel_type": "ATM", "terminal_id": "T0806058", "terminal_location": "JKT AM LEBAK BULUS", "sukses": 1156, "gagal_sistem_bank": 40, "gagal_nasabah": 95, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 1196, "biaya_gross": 2075060, "proporsi_repay": 38.03, "repay_nominal": 789145},
    {"no": 3, "channel_type": "ATM", "terminal_id": "T0800783", "terminal_location": "BKS MD JATIBENING 01", "sukses": 2989, "gagal_sistem_bank": 52, "gagal_nasabah": 207, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 3041, "biaya_gross": 5276135, "proporsi_repay": 78.52, "repay_nominal": 4142815},
    {"no": 4, "channel_type": "ATM", "terminal_id": "T0200728", "terminal_location": "KC JKT PASAR MINGGU", "sukses": 122, "gagal_sistem_bank": 0, "gagal_nasabah": 17, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 122, "biaya_gross": 211670, "proporsi_repay": 45.34, "repay_nominal": 95971},
    {"no": 5, "channel_type": "ATM", "terminal_id": "T0200162", "terminal_location": "KC BALIKPAPAN SUDIRMAN", "sukses": 62, "gagal_sistem_bank": 1, "gagal_nasabah": 4, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 63, "biaya_gross": 109305, "proporsi_repay": 45.34, "repay_nominal": 49559},
    {"no": 6, "channel_type": "ATM", "terminal_id": "T0808683", "terminal_location": "JKT GD BELTWAYOFCPARK 01", "sukses": 2117, "gagal_sistem_bank": 31, "gagal_nasabah": 80, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 2148, "biaya_gross": 3726780, "proporsi_repay": 38.03, "repay_nominal": 1417293},
    {"no": 7, "channel_type": "ATM", "terminal_id": "T0805908", "terminal_location": "BKS IM PRAMUKARAWA 01", "sukses": 2987, "gagal_sistem_bank": 45, "gagal_nasabah": 203, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 3032, "biaya_gross": 5260520, "proporsi_repay": 38.03, "repay_nominal": 2000574},
    {"no": 8, "channel_type": "ATM", "terminal_id": "T0900816", "terminal_location": "INDOMARET NIPA-NIPA", "sukses": 127, "gagal_sistem_bank": 5, "gagal_nasabah": 8, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 132, "biaya_gross": 229020, "proporsi_repay": 45.34, "repay_nominal": 103838},
    {"no": 9, "channel_type": "ATM", "terminal_id": "T2060333", "terminal_location": "KEMENTERIAN PUPR", "sukses": 14, "gagal_sistem_bank": 1, "gagal_nasabah": 4, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 15, "biaya_gross": 26025, "proporsi_repay": 45.34, "repay_nominal": 11800},
    {"no": 10, "channel_type": "ATM", "terminal_id": "T0801007", "terminal_location": "JKT PB PEMUDA 01", "sukses": 845, "gagal_sistem_bank": 17, "gagal_nasabah": 72, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 862, "biaya_gross": 1495570, "proporsi_repay": 38.03, "repay_nominal": 568765},
    {"no": 11, "channel_type": "ATM", "terminal_id": "T0203973", "terminal_location": "KC PLEIHARI", "sukses": 160, "gagal_sistem_bank": 0, "gagal_nasabah": 6, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 160, "biaya_gross": 277600, "proporsi_repay": 45.34, "repay_nominal": 125864},
    {"no": 12, "channel_type": "ATM", "terminal_id": "T0203204", "terminal_location": "RUMAH MAKAN SETIA", "sukses": 123, "gagal_sistem_bank": 2, "gagal_nasabah": 22, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 125, "biaya_gross": 216875, "proporsi_repay": 45.34, "repay_nominal": 98331},
    {"no": 13, "channel_type": "ATM", "terminal_id": "T0900720", "terminal_location": "PEGADAIAN KANWIL JABAR", "sukses": 221, "gagal_sistem_bank": 15, "gagal_nasabah": 17, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 236, "biaya_gross": 409460, "proporsi_repay": 45.34, "repay_nominal": 185649},
    {"no": 14, "channel_type": "ATM", "terminal_id": "T0200404", "terminal_location": "KC WATES", "sukses": 30, "gagal_sistem_bank": 0, "gagal_nasabah": 3, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 30, "biaya_gross": 52050, "proporsi_repay": 45.34, "repay_nominal": 23600},
    {"no": 15, "channel_type": "ATM", "terminal_id": "T0803956", "terminal_location": "SRG IM JKT KM.68 01", "sukses": 1197, "gagal_sistem_bank": 18, "gagal_nasabah": 113, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 1215, "biaya_gross": 2108025, "proporsi_repay": 38.03, "repay_nominal": 801681},
    {"no": 16, "channel_type": "ATM", "terminal_id": "T0203058", "terminal_location": "KC TANJUNG KARANG", "sukses": 16, "gagal_sistem_bank": 1, "gagal_nasabah": 0, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 17, "biaya_gross": 29495, "proporsi_repay": 45.34, "repay_nominal": 13373},
    {"no": 17, "channel_type": "ATM", "terminal_id": "T0807689", "terminal_location": "JKT IM H KASAM", "sukses": 1843, "gagal_sistem_bank": 38, "gagal_nasabah": 153, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 1881, "biaya_gross": 3263535, "proporsi_repay": 38.03, "repay_nominal": 1241121},
    {"no": 18, "channel_type": "ATM", "terminal_id": "T0804722", "terminal_location": "TSM PB MRTDNTA34.46103 01", "sukses": 3954, "gagal_sistem_bank": 24, "gagal_nasabah": 281, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 3978, "biaya_gross": 6901830, "proporsi_repay": 38.03, "repay_nominal": 2624764},
    {"no": 19, "channel_type": "ATM", "terminal_id": "T0901810", "terminal_location": "GALLERY RUMDIS PW", "sukses": 32, "gagal_sistem_bank": 1, "gagal_nasabah": 3, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 33, "biaya_gross": 57255, "proporsi_repay": 45.34, "repay_nominal": 25959},
    {"no": 20, "channel_type": "ATM", "terminal_id": "T0900574", "terminal_location": "INDOMARET SUKARESMI", "sukses": 423, "gagal_sistem_bank": 7, "gagal_nasabah": 19, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 430, "biaya_gross": 746050, "proporsi_repay": 45.34, "repay_nominal": 338260},
    {"no": 21, "channel_type": "ATM", "terminal_id": "T0901340", "terminal_location": "Indomaret Fatahillah", "sukses": 70, "gagal_sistem_bank": 0, "gagal_nasabah": 9, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 70, "biaya_gross": 121450, "proporsi_repay": 45.34, "repay_nominal": 55066},
    {"no": 22, "channel_type": "ATM", "terminal_id": "T0901219", "terminal_location": "SPBU KETAPANG", "sukses": 70, "gagal_sistem_bank": 0, "gagal_nasabah": 6, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 70, "biaya_gross": 121450, "proporsi_repay": 45.34, "repay_nominal": 55066},
    {"no": 23, "channel_type": "ATM", "terminal_id": "T0806745", "terminal_location": "SBY ED UNUNIVKPETRA 01", "sukses": 3462, "gagal_sistem_bank": 51, "gagal_nasabah": 287, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 3513, "biaya_gross": 6095055, "proporsi_repay": 38.03, "repay_nominal": 2317948},
    {"no": 24, "channel_type": "ATM", "terminal_id": "T0202801", "terminal_location": "STBA LIA", "sukses": 186, "gagal_sistem_bank": 1, "gagal_nasabah": 17, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 187, "biaya_gross": 324445, "proporsi_repay": 45.34, "repay_nominal": 147104},
    {"no": 25, "channel_type": "ATM", "terminal_id": "T0900033", "terminal_location": "ALOON-ALOON CENTER", "sukses": 217, "gagal_sistem_bank": 0, "gagal_nasabah": 18, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 217, "biaya_gross": 376495, "proporsi_repay": 45.34, "repay_nominal": 170703},
    {"no": 26, "channel_type": "ATM", "terminal_id": "T0900022", "terminal_location": "KCP BPJS KESEHATAN 2", "sukses": 2, "gagal_sistem_bank": 0, "gagal_nasabah": 0, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 2, "biaya_gross": 3470, "proporsi_repay": 45.34, "repay_nominal": 1573},
    {"no": 27, "channel_type": "ATM", "terminal_id": "T0900791", "terminal_location": "INDOMARET POSO", "sukses": 16, "gagal_sistem_bank": 1, "gagal_nasabah": 1, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 17, "biaya_gross": 29495, "proporsi_repay": 45.34, "repay_nominal": 13373},
    {"no": 28, "channel_type": "ATM", "terminal_id": "T0804950", "terminal_location": "SKB AM CIDAHU2-X617 01", "sukses": 2283, "gagal_sistem_bank": 31, "gagal_nasabah": 188, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 2314, "biaya_gross": 4014790, "proporsi_repay": 38.03, "repay_nominal": 1526823},
    {"no": 29, "channel_type": "ATM", "terminal_id": "T0901988", "terminal_location": "KODAM", "sukses": 40, "gagal_sistem_bank": 0, "gagal_nasabah": 7, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 40, "biaya_gross": 69400, "proporsi_repay": 45.34, "repay_nominal": 31466},
    {"no": 30, "channel_type": "ATM", "terminal_id": "T0804793", "terminal_location": "PML IM KARTINIPETARUKN 01", "sukses": 3400, "gagal_sistem_bank": 37, "gagal_nasabah": 238, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 3437, "biaya_gross": 5963195, "proporsi_repay": 38.03, "repay_nominal": 2267801},
    {"no": 31, "channel_type": "ATM", "terminal_id": "T0800085", "terminal_location": "PLK PB MTHARYONOSAMPIT 01", "sukses": 275, "gagal_sistem_bank": 4, "gagal_nasabah": 48, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 279, "biaya_gross": 484065, "proporsi_repay": 78.52, "repay_nominal": 380087},
    {"no": 32, "channel_type": "ATM", "terminal_id": "T0901436", "terminal_location": "CABANGE MACANRE SOPPENG", "sukses": 277, "gagal_sistem_bank": 0, "gagal_nasabah": 24, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 277, "biaya_gross": 480595, "proporsi_repay": 45.34, "repay_nominal": 217902},
    {"no": 33, "channel_type": "ATM", "terminal_id": "T0809317", "terminal_location": "BGR IM CILEUBUTTIMUR 01", "sukses": 3777, "gagal_sistem_bank": 43, "gagal_nasabah": 273, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 3820, "biaya_gross": 6627700, "proporsi_repay": 38.03, "repay_nominal": 2520512},
    {"no": 34, "channel_type": "ATM", "terminal_id": "T0805185", "terminal_location": "MLG SM ENAKECOPAKISAJI 01", "sukses": 3821, "gagal_sistem_bank": 24, "gagal_nasabah": 318, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 3845, "biaya_gross": 6671075, "proporsi_repay": 38.03, "repay_nominal": 2537008},
    {"no": 35, "channel_type": "ATM", "terminal_id": "T0200269", "terminal_location": "KC PADANG PANJANG", "sukses": 38, "gagal_sistem_bank": 0, "gagal_nasabah": 4, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 38, "biaya_gross": 65930, "proporsi_repay": 45.34, "repay_nominal": 29893},
    {"no": 36, "channel_type": "ATM", "terminal_id": "T0804095", "terminal_location": "TNG AM TIGARAKSA 02", "sukses": 431, "gagal_sistem_bank": 0, "gagal_nasabah": 12, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 431, "biaya_gross": 747785, "proporsi_repay": 38.03, "repay_nominal": 284382},
    {"no": 37, "channel_type": "ATM", "terminal_id": "T0902067", "terminal_location": "INDOMARET MPU TANTULAR", "sukses": 396, "gagal_sistem_bank": 14, "gagal_nasabah": 45, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 410, "biaya_gross": 711350, "proporsi_repay": 45.34, "repay_nominal": 322526},
    {"no": 38, "channel_type": "ATM", "terminal_id": "T2001639", "terminal_location": "SPBU 34.16712", "sukses": 33, "gagal_sistem_bank": 0, "gagal_nasabah": 3, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 33, "biaya_gross": 57255, "proporsi_repay": 45.34, "repay_nominal": 25959},
    {"no": 39, "channel_type": "ATM", "terminal_id": "T0200415", "terminal_location": "KC BOGOR PAJAJARAN", "sukses": 25, "gagal_sistem_bank": 1, "gagal_nasabah": 2, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 26, "biaya_gross": 45110, "proporsi_repay": 45.34, "repay_nominal": 20453},
    {"no": 40, "channel_type": "ATM", "terminal_id": "T0800999", "terminal_location": "JKT MM CKJATBAR 01", "sukses": 1835, "gagal_sistem_bank": 27, "gagal_nasabah": 167, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 1862, "biaya_gross": 3230570, "proporsi_repay": 38.03, "repay_nominal": 1228585},
    {"no": 41, "channel_type": "ATM", "terminal_id": "T0800470", "terminal_location": "JKT HT FASHION 01", "sukses": 833, "gagal_sistem_bank": 13, "gagal_nasabah": 78, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 846, "biaya_gross": 1467810, "proporsi_repay": 78.52, "repay_nominal": 1152523},
    {"no": 42, "channel_type": "ATM", "terminal_id": "T0900731", "terminal_location": "INDOMARET SUNGAI BAMBU 2", "sukses": 217, "gagal_sistem_bank": 6, "gagal_nasabah": 21, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 223, "biaya_gross": 386905, "proporsi_repay": 45.34, "repay_nominal": 175423},
    {"no": 43, "channel_type": "ATM", "terminal_id": "T0902273", "terminal_location": "NAGOYA IT CENTER", "sukses": 356, "gagal_sistem_bank": 11, "gagal_nasabah": 30, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 367, "biaya_gross": 636745, "proporsi_repay": 45.34, "repay_nominal": 288701},
    {"no": 44, "channel_type": "ATM", "terminal_id": "T0804565", "terminal_location": "TNG IM KEDAUNGPAMULANG 01", "sukses": 1949, "gagal_sistem_bank": 38, "gagal_nasabah": 179, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 1987, "biaya_gross": 3447445, "proporsi_repay": 38.03, "repay_nominal": 1311062},
    {"no": 45, "channel_type": "ATM", "terminal_id": "T0200717", "terminal_location": "KC CINERE", "sukses": 43, "gagal_sistem_bank": 0, "gagal_nasabah": 3, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 43, "biaya_gross": 74605, "proporsi_repay": 45.34, "repay_nominal": 33826},
    {"no": 46, "channel_type": "ATM", "terminal_id": "T2001397", "terminal_location": "FAK TEKNIK UNNES", "sukses": 32, "gagal_sistem_bank": 0, "gagal_nasabah": 1, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 32, "biaya_gross": 55520, "proporsi_repay": 45.34, "repay_nominal": 25173},
    {"no": 47, "channel_type": "ATM", "terminal_id": "T2013354", "terminal_location": "YYS AL MUNIR", "sukses": 503, "gagal_sistem_bank": 1, "gagal_nasabah": 34, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 504, "biaya_gross": 874440, "proporsi_repay": 45.34, "repay_nominal": 396472},
    {"no": 48, "channel_type": "ATM", "terminal_id": "T0805894", "terminal_location": "BKS ED YSKID 02", "sukses": 3738, "gagal_sistem_bank": 60, "gagal_nasabah": 354, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 3798, "biaya_gross": 6589530, "proporsi_repay": 38.03, "repay_nominal": 2505996},
    {"no": 49, "channel_type": "ATM", "terminal_id": "T0805125", "terminal_location": "GRT PB CKAJANG34.44110 01", "sukses": 1605, "gagal_sistem_bank": 21, "gagal_nasabah": 170, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 1626, "biaya_gross": 2821110, "proporsi_repay": 38.03, "repay_nominal": 1072867},
    {"no": 50, "channel_type": "ATM", "terminal_id": "T0802108", "terminal_location": "JKT GD TATAPURI 01", "sukses": 2108, "gagal_sistem_bank": 61, "gagal_nasabah": 139, "gagal_sistem_jalin": 0, "total_transaksi_ditagihkan": 2169, "biaya_gross": 3763215, "proporsi_repay": 38.03, "repay_nominal": 1431150},
]


def calculate_summary(data: list, period: str = "Unknown", bank_code: str = "008 - MDR", report_id: str = None) -> dict:
    """Calculate summary statistics from transaction data"""
    if not data:
        return None
    
    total_sukses = sum(d.get('sukses', 0) for d in data)
    total_gagal_sistem_bank = sum(d.get('gagal_sistem_bank', 0) for d in data)
    total_gagal_nasabah = sum(d.get('gagal_nasabah', 0) for d in data)
    total_gagal_sistem_jalin = sum(d.get('gagal_sistem_jalin', 0) for d in data)
    total_transaksi_ditagihkan = sum(d.get('total_transaksi_ditagihkan', 0) for d in data)
    total_biaya_gross = sum(d.get('biaya_gross', 0) for d in data)
    total_repay_nominal = sum(d.get('repay_nominal', 0) for d in data)
    avg_proporsi_repay = sum(d.get('proporsi_repay', 0) for d in data) / len(data) if data else 0
    
    # Top 10 terminals by transaksi sukses
    sorted_by_sukses = sorted(data, key=lambda x: x.get('sukses', 0), reverse=True)[:10]
    top_terminals = [{
        "terminal_id": t.get('terminal_id', ''),
        "terminal_location": t.get('terminal_location', ''),
        "sukses": t.get('sukses', 0),
        "repay_nominal": t.get('repay_nominal', 0)
    } for t in sorted_by_sukses]
    
    # Bottom 10 terminals by transaksi sukses
    sorted_by_sukses_asc = sorted(data, key=lambda x: x.get('sukses', 0))[:10]
    bottom_terminals = [{
        "terminal_id": t.get('terminal_id', ''),
        "terminal_location": t.get('terminal_location', ''),
        "sukses": t.get('sukses', 0),
        "repay_nominal": t.get('repay_nominal', 0)
    } for t in sorted_by_sukses_asc]
    
    # Proporsi distribution
    proporsi_low = len([d for d in data if d.get('proporsi_repay', 0) < 40])
    proporsi_medium = len([d for d in data if 40 <= d.get('proporsi_repay', 0) < 60])
    proporsi_high = len([d for d in data if 60 <= d.get('proporsi_repay', 0) < 80])
    proporsi_very_high = len([d for d in data if d.get('proporsi_repay', 0) >= 80])
    
    return {
        "total_terminals": len(data),
        "total_transaksi_sukses": total_sukses,
        "total_gagal_sistem_bank": total_gagal_sistem_bank,
        "total_gagal_nasabah": total_gagal_nasabah,
        "total_gagal_sistem_jalin": total_gagal_sistem_jalin,
        "total_transaksi_ditagihkan": total_transaksi_ditagihkan,
        "total_biaya_gross": total_biaya_gross,
        "total_repay_nominal": total_repay_nominal,
        "avg_proporsi_repay": round(avg_proporsi_repay, 2),
        "top_terminals": top_terminals,
        "bottom_terminals": bottom_terminals,
        "proporsi_distribution": {
            "low (<40%)": proporsi_low,
            "medium (40-60%)": proporsi_medium,
            "high (60-80%)": proporsi_high,
            "very_high (>=80%)": proporsi_very_high
        },
        "period": period,
        "bank_code": bank_code,
        "report_id": report_id
    }


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


@api_router.get("/reports")
async def get_all_reports():
    """Get all uploaded reports"""
    reports = await db.reports.find({}, {"_id": 0}).sort("upload_date", -1).to_list(100)
    
    # Convert datetime strings back
    for report in reports:
        if isinstance(report.get('upload_date'), str):
            report['upload_date'] = datetime.fromisoformat(report['upload_date'])
    
    return {"reports": reports}


@api_router.get("/report/summary")
async def get_report_summary(report_id: Optional[str] = None):
    """Get summary of ATM REPAY report. If report_id is provided, get specific report, otherwise get latest or initial data."""
    
    if report_id:
        # Get specific report transactions
        transactions = await db.transactions.find({"report_id": report_id}, {"_id": 0}).to_list(10000)
        report = await db.reports.find_one({"id": report_id}, {"_id": 0})
        
        if not transactions:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return calculate_summary(
            transactions, 
            period=report.get('period', 'Unknown') if report else 'Unknown',
            bank_code=report.get('bank_code', '008 - MDR') if report else '008 - MDR',
            report_id=report_id
        )
    
    # Check if there are any uploaded reports
    latest_report = await db.reports.find_one({}, {"_id": 0}, sort=[("upload_date", -1)])
    
    if latest_report:
        transactions = await db.transactions.find({"report_id": latest_report['id']}, {"_id": 0}).to_list(10000)
        return calculate_summary(
            transactions,
            period=latest_report.get('period', 'Unknown'),
            bank_code=latest_report.get('bank_code', '008 - MDR'),
            report_id=latest_report['id']
        )
    
    # Return initial data if no uploads
    return calculate_summary(INITIAL_REPORT_DATA, period="Desember 2025", bank_code="008 - MDR")


def get_bank_name(terminal_id: str) -> str:
    """Get bank name from terminal ID prefix"""
    if not terminal_id:
        return "Unknown"
    
    prefix = terminal_id[:3].upper()
    bank_mapping = {
        "T08": "Mandiri",
        "T09": "BNI",
        "T20": "BTN",
        "T02": "BRI"
    }
    return bank_mapping.get(prefix, "Unknown")


def expand_transactions(summary_data: list, data_date: str = None) -> list:
    """Expand summary transactions into individual transaction rows"""
    expanded = []
    
    for item in summary_data:
        terminal_id = item.get('terminal_id', '')
        terminal_location = item.get('terminal_location', '')
        date = data_date or item.get('data_date', '-')
        bank = get_bank_name(terminal_id)
        
        # Add sukses transactions
        for i in range(item.get('sukses', 0)):
            expanded.append({
                "terminal_id": terminal_id,
                "terminal_location": terminal_location,
                "bank": bank,
                "status": "Sukses",
                "data_date": date
            })
        
        # Add gagal sistem bank transactions
        for i in range(item.get('gagal_sistem_bank', 0)):
            expanded.append({
                "terminal_id": terminal_id,
                "terminal_location": terminal_location,
                "bank": bank,
                "status": "Gagal Sistem Bank",
                "data_date": date
            })
        
        # Add gagal nasabah transactions
        for i in range(item.get('gagal_nasabah', 0)):
            expanded.append({
                "terminal_id": terminal_id,
                "terminal_location": terminal_location,
                "bank": bank,
                "status": "Gagal Nasabah",
                "data_date": date
            })
        
        # Add gagal sistem jalin transactions
        for i in range(item.get('gagal_sistem_jalin', 0)):
            expanded.append({
                "terminal_id": terminal_id,
                "terminal_location": terminal_location,
                "bank": bank,
                "status": "Gagal Sistem Jalin",
                "data_date": date
            })
    
    return expanded


@api_router.get("/report/transactions")
async def get_all_transactions(report_id: Optional[str] = None, page: int = 1, limit: int = 50, search: str = "", sort_by: str = "terminal_id", sort_order: str = "asc"):
    """Get all ATM transaction data with pagination, sorted by terminal_id"""
    
    skip = (page - 1) * limit
    sort_direction = 1 if sort_order == "asc" else -1
    
    if report_id:
        query = {"report_id": report_id}
        if search:
            query["$or"] = [
                {"terminal_id": {"$regex": search, "$options": "i"}},
                {"terminal_location": {"$regex": search, "$options": "i"}}
            ]
        
        transactions = await db.transactions.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
        total = await db.transactions.count_documents(query)
        
        if transactions:
            return {
                "data": transactions, 
                "total": total, 
                "page": page, 
                "limit": limit,
                "pages": (total + limit - 1) // limit
            }
    
    # Check for latest report
    latest_report = await db.reports.find_one({}, {"_id": 0}, sort=[("upload_date", -1)])
    
    if latest_report:
        query = {"report_id": latest_report['id']}
        if search:
            query["$or"] = [
                {"terminal_id": {"$regex": search, "$options": "i"}},
                {"terminal_location": {"$regex": search, "$options": "i"}}
            ]
        
        transactions = await db.transactions.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
        total = await db.transactions.count_documents(query)
        
        return {
            "data": transactions, 
            "total": total, 
            "page": page, 
            "limit": limit,
            "pages": (total + limit - 1) // limit,
            "report_id": latest_report['id']
        }
    
    # Return initial data sorted
    filtered_data = INITIAL_REPORT_DATA.copy()
    if search:
        filtered_data = [d for d in filtered_data if search.lower() in d['terminal_id'].lower() or search.lower() in d['terminal_location'].lower()]
    
    # Sort data
    filtered_data.sort(key=lambda x: x.get(sort_by, ''), reverse=(sort_order == "desc"))
    
    total = len(filtered_data)
    paginated_data = filtered_data[skip:skip+limit]
    
    return {
        "data": paginated_data, 
        "total": total, 
        "page": page, 
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@api_router.get("/report/transactions-detail")
async def get_transactions_detail(report_id: Optional[str] = None, page: int = 1, limit: int = 100, search: str = "", status_filter: str = ""):
    """Get individual transaction details (expanded from summary)"""
    
    skip = (page - 1) * limit
    data_date = "-"
    
    if report_id:
        # Get report info for date
        report = await db.reports.find_one({"id": report_id}, {"_id": 0})
        if report:
            data_date = report.get('data_date', '-')
        
        query = {"report_id": report_id}
        transactions = await db.transactions.find(query, {"_id": 0}).sort("terminal_id", 1).to_list(10000)
        
        if transactions:
            expanded = expand_transactions(transactions, data_date)
            
            # Apply search filter
            if search:
                expanded = [t for t in expanded if search.lower() in t['terminal_id'].lower() or search.lower() in t['terminal_location'].lower()]
            
            # Apply status filter
            if status_filter:
                expanded = [t for t in expanded if t['status'] == status_filter]
            
            total = len(expanded)
            paginated = expanded[skip:skip+limit]
            
            return {
                "data": paginated,
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit
            }
    
    # Check for latest report
    latest_report = await db.reports.find_one({}, {"_id": 0}, sort=[("upload_date", -1)])
    
    if latest_report:
        data_date = latest_report.get('data_date', '-')
        query = {"report_id": latest_report['id']}
        transactions = await db.transactions.find(query, {"_id": 0}).sort("terminal_id", 1).to_list(10000)
        
        if transactions:
            expanded = expand_transactions(transactions, data_date)
            
            if search:
                expanded = [t for t in expanded if search.lower() in t['terminal_id'].lower() or search.lower() in t['terminal_location'].lower()]
            
            if status_filter:
                expanded = [t for t in expanded if t['status'] == status_filter]
            
            total = len(expanded)
            paginated = expanded[skip:skip+limit]
            
            return {
                "data": paginated,
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit
            }
    
    # Return initial data expanded
    expanded = expand_transactions(INITIAL_REPORT_DATA, "25-12-2025")
    
    if search:
        expanded = [t for t in expanded if search.lower() in t['terminal_id'].lower() or search.lower() in t['terminal_location'].lower()]
    
    if status_filter:
        expanded = [t for t in expanded if t['status'] == status_filter]
    
    total = len(expanded)
    paginated = expanded[skip:skip+limit]
    
    return {
        "data": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@api_router.get("/report/transactions-detail/export")
async def export_transactions_detail(report_id: Optional[str] = None, search: str = "", status_filter: str = ""):
    """Export all individual transaction details"""
    
    data_date = "-"
    
    if report_id:
        report = await db.reports.find_one({"id": report_id}, {"_id": 0})
        if report:
            data_date = report.get('data_date', '-')
        
        query = {"report_id": report_id}
        transactions = await db.transactions.find(query, {"_id": 0}).sort("terminal_id", 1).to_list(10000)
        
        if transactions:
            expanded = expand_transactions(transactions, data_date)
            
            if search:
                expanded = [t for t in expanded if search.lower() in t['terminal_id'].lower() or search.lower() in t['terminal_location'].lower()]
            
            if status_filter:
                expanded = [t for t in expanded if t['status'] == status_filter]
            
            return {"data": expanded}
    
    latest_report = await db.reports.find_one({}, {"_id": 0}, sort=[("upload_date", -1)])
    
    if latest_report:
        data_date = latest_report.get('data_date', '-')
        query = {"report_id": latest_report['id']}
        transactions = await db.transactions.find(query, {"_id": 0}).sort("terminal_id", 1).to_list(10000)
        
        if transactions:
            expanded = expand_transactions(transactions, data_date)
            
            if search:
                expanded = [t for t in expanded if search.lower() in t['terminal_id'].lower() or search.lower() in t['terminal_location'].lower()]
            
            if status_filter:
                expanded = [t for t in expanded if t['status'] == status_filter]
            
            return {"data": expanded}
    
    expanded = expand_transactions(INITIAL_REPORT_DATA, "25-12-2025")
    
    if search:
        expanded = [t for t in expanded if search.lower() in t['terminal_id'].lower() or search.lower() in t['terminal_location'].lower()]
    
    if status_filter:
        expanded = [t for t in expanded if t['status'] == status_filter]
    
    return {"data": expanded}


@api_router.get("/report/transactions/export")
async def export_transactions(report_id: Optional[str] = None, search: str = ""):
    """Export all transactions for CSV/Excel download"""
    
    if report_id:
        query = {"report_id": report_id}
        if search:
            query["$or"] = [
                {"terminal_id": {"$regex": search, "$options": "i"}},
                {"terminal_location": {"$regex": search, "$options": "i"}}
            ]
        
        transactions = await db.transactions.find(query, {"_id": 0}).sort("terminal_id", 1).to_list(10000)
        
        if transactions:
            return {"data": transactions}
    
    # Check for latest report
    latest_report = await db.reports.find_one({}, {"_id": 0}, sort=[("upload_date", -1)])
    
    if latest_report:
        query = {"report_id": latest_report['id']}
        if search:
            query["$or"] = [
                {"terminal_id": {"$regex": search, "$options": "i"}},
                {"terminal_location": {"$regex": search, "$options": "i"}}
            ]
        
        transactions = await db.transactions.find(query, {"_id": 0}).sort("terminal_id", 1).to_list(10000)
        return {"data": transactions}
    
    # Return initial data sorted
    sorted_data = sorted(INITIAL_REPORT_DATA, key=lambda x: x.get('terminal_id', ''))
    if search:
        sorted_data = [d for d in sorted_data if search.lower() in d['terminal_id'].lower() or search.lower() in d['terminal_location'].lower()]
    
    return {"data": sorted_data}


@api_router.get("/report/terminal-summary")
async def get_terminal_summary(report_id: Optional[str] = None, search: str = ""):
    """Get summary per terminal with search capability"""
    
    transactions = []
    
    if report_id:
        query = {"report_id": report_id}
        transactions = await db.transactions.find(query, {"_id": 0}).sort("terminal_id", 1).to_list(10000)
    else:
        # Check for latest report
        latest_report = await db.reports.find_one({}, {"_id": 0}, sort=[("upload_date", -1)])
        
        if latest_report:
            query = {"report_id": latest_report['id']}
            transactions = await db.transactions.find(query, {"_id": 0}).sort("terminal_id", 1).to_list(10000)
        else:
            transactions = sorted(INITIAL_REPORT_DATA, key=lambda x: x.get('terminal_id', ''))
    
    # Apply search filter
    if search:
        transactions = [t for t in transactions if 
                       search.lower() in t.get('terminal_id', '').lower() or 
                       search.lower() in t.get('terminal_location', '').lower() or
                       search.lower() in get_bank_name(t.get('terminal_id', '')).lower()]
    
    # Calculate summary per terminal
    terminal_summary = []
    for t in transactions:
        total_transaksi = t.get('sukses', 0) + t.get('gagal_sistem_bank', 0) + t.get('gagal_nasabah', 0) + t.get('gagal_sistem_jalin', 0)
        success_rate = (t.get('sukses', 0) / total_transaksi * 100) if total_transaksi > 0 else 0
        
        terminal_summary.append({
            "terminal_id": t.get('terminal_id', ''),
            "terminal_location": t.get('terminal_location', ''),
            "bank": get_bank_name(t.get('terminal_id', '')),
            "total_transaksi": total_transaksi,
            "sukses": t.get('sukses', 0),
            "gagal": t.get('gagal_sistem_bank', 0) + t.get('gagal_nasabah', 0) + t.get('gagal_sistem_jalin', 0),
            "success_rate": round(success_rate, 2),
            "biaya_gross": t.get('biaya_gross', 0),
            "repay_nominal": t.get('repay_nominal', 0),
            "proporsi_repay": t.get('proporsi_repay', 0)
        })
    
    return {
        "data": terminal_summary,
        "total": len(terminal_summary)
    }


@api_router.post("/report/upload")
async def upload_report(file: UploadFile = File(...), period: str = Form(None), bank_code: str = Form("008 - MDR"), data_date: str = Form(None)):
    """Upload and process a report file"""
    
    # Read file content
    content = await file.read()
    
    try:
        text_content = content.decode('utf-8')
    except:
        try:
            text_content = content.decode('latin-1')
        except:
            raise HTTPException(status_code=400, detail="Unable to read file encoding")
    
    # Parse the file
    transactions, detected_period, detected_bank = parse_report_file(text_content)
    
    # Use provided values or detected ones
    final_period = period if period else detected_period
    final_bank = bank_code if bank_code != "008 - MDR" else detected_bank
    final_data_date = data_date if data_date else datetime.now(timezone.utc).strftime("%d-%m-%Y")
    
    if not transactions:
        # If parsing failed, store raw data and let user know
        # Create report with manual entry option
        report_id = str(uuid.uuid4())
        report = {
            "id": report_id,
            "filename": file.filename,
            "period": final_period,
            "bank_code": final_bank,
            "data_date": final_data_date,
            "upload_date": datetime.now(timezone.utc).isoformat(),
            "total_terminals": 0,
            "total_transaksi_sukses": 0,
            "total_repay_nominal": 0,
            "raw_content": text_content[:5000],  # Store first 5000 chars for reference
            "status": "pending_manual_entry"
        }
        await db.reports.insert_one(report)
        
        return {
            "success": False,
            "message": "File uploaded but automatic parsing failed. Please enter data manually.",
            "report_id": report_id,
            "filename": file.filename
        }
    
    # Create report record
    report_id = str(uuid.uuid4())
    total_sukses = sum(t.get('sukses', 0) for t in transactions)
    total_repay = sum(t.get('repay_nominal', 0) for t in transactions)
    
    report = {
        "id": report_id,
        "filename": file.filename,
        "period": final_period,
        "bank_code": final_bank,
        "data_date": final_data_date,
        "upload_date": datetime.now(timezone.utc).isoformat(),
        "total_terminals": len(transactions),
        "total_transaksi_sukses": total_sukses,
        "total_repay_nominal": total_repay,
        "status": "completed"
    }
    await db.reports.insert_one(report)
    
    # Store transactions
    for t in transactions:
        t['id'] = str(uuid.uuid4())
        t['report_id'] = report_id
        t['data_date'] = final_data_date
    
    if transactions:
        await db.transactions.insert_many(transactions)
    
    return {
        "success": True,
        "message": f"Successfully uploaded {len(transactions)} transactions",
        "report_id": report_id,
        "filename": file.filename,
        "period": final_period,
        "data_date": final_data_date,
        "total_transactions": len(transactions),
        "total_sukses": total_sukses,
        "total_repay_nominal": total_repay
    }


@api_router.post("/report/manual")
async def add_manual_transactions(transactions: List[dict], period: str = "Unknown", bank_code: str = "008 - MDR"):
    """Manually add transactions for a new report"""
    
    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions provided")
    
    report_id = str(uuid.uuid4())
    total_sukses = sum(t.get('sukses', 0) for t in transactions)
    total_repay = sum(t.get('repay_nominal', 0) for t in transactions)
    
    report = {
        "id": report_id,
        "filename": "manual_entry",
        "period": period,
        "bank_code": bank_code,
        "upload_date": datetime.now(timezone.utc).isoformat(),
        "total_terminals": len(transactions),
        "total_transaksi_sukses": total_sukses,
        "total_repay_nominal": total_repay,
        "status": "completed"
    }
    await db.reports.insert_one(report)
    
    # Store transactions
    for i, t in enumerate(transactions):
        t['id'] = str(uuid.uuid4())
        t['report_id'] = report_id
        t['no'] = i + 1
    
    await db.transactions.insert_many(transactions)
    
    return {
        "success": True,
        "report_id": report_id,
        "total_transactions": len(transactions)
    }


@api_router.delete("/report/{report_id}")
async def delete_report(report_id: str):
    """Delete a report and its transactions"""
    
    # Delete transactions
    await db.transactions.delete_many({"report_id": report_id})
    
    # Delete report
    result = await db.reports.delete_one({"id": report_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"success": True, "message": "Report deleted successfully"}


@api_router.get("/report/transaction/{terminal_id}")
async def get_transaction_by_terminal(terminal_id: str):
    """Get transaction data by terminal ID"""
    # Check database first
    transaction = await db.transactions.find_one({"terminal_id": terminal_id}, {"_id": 0})
    
    if transaction:
        return transaction
    
    # Check initial data
    for t in INITIAL_REPORT_DATA:
        if t['terminal_id'] == terminal_id:
            return t
    
    raise HTTPException(status_code=404, detail="Terminal not found")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
