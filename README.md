# Monitoring Jemuran

## Jalankan backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Jalankan frontend
```bash
cd frontend
npm install
npm run dev
```
Buka `http://localhost:5173`.

## Login admin demo
`admin / admin123`

## Hardware besok
Kode penerima serial ada di `backend/serial_reader.py`, tetapi masih dikomentari. Setelah Arduino tersedia:
1. Upload `arduino/monitoring_jemuran.ino`.
2. Hapus komentar pada `serial_reader.py`.
3. Aktifkan import dan runner serial pada `backend/app.py`.
4. Ubah `SENSOR_MODE='serial'` pada `backend/config.py`.
5. Sesuaikan port, misalnya `COM3`.
