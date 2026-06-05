# Sistem Monitoring Jemuran

Sistem monitoring kondisi jemuran berbasis Arduino dan web. Sensor hujan membaca tingkat kebasahan, lalu Arduino mengaktifkan LED dan buzzer sesuai kondisi cuaca. Data dikirim melalui USB Serial ke backend Flask dan ditampilkan pada dashboard React.

## Fitur

* Monitoring kondisi `CERAH`, `GERIMIS`, dan `HUJAN`
* LED indikator:

  * Hijau: cerah
  * Kuning: gerimis
  * Merah: hujan
* Buzzer aktif saat hujan
* Dashboard web real-time
* Riwayat pembacaan sensor
* Login dan halaman pengaturan admin
* Pengaturan threshold, interval pembacaan, buzzer, dan port serial
* Mode mock untuk simulasi tanpa hardware

## Tech Stack

| Bagian   | Teknologi                             |
| -------- | ------------------------------------- |
| Hardware | Arduino Uno, rain sensor, LED, buzzer |
| Firmware | Arduino C++                           |
| Backend  | Python Flask, PySerial                |
| Database | SQLite                                |
| Frontend | React + Vite                          |

## Wiring Arduino

| Komponen       | Pin   |
| -------------- | ----- |
| Rain Sensor AO | `A0`  |
| LED Hijau      | `D5`  |
| LED Kuning     | `D6`  |
| LED Merah      | `D7`  |
| Buzzer         | `D11` |

## Menjalankan Backend

```bash
cd backend
python -m venv .Andesisenv
```

Aktifkan virtual environment pada Windows:

```bash
.Andesisenv\Scripts\activate
```

Install dependency dan jalankan backend:

```bash
pip install -r requirements.txt
python app.py
```

Backend berjalan pada:

```text
http://127.0.0.1:5000
```

## Menjalankan Frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Dashboard dapat dibuka pada:

```text
http://localhost:5173
```

## Konfigurasi Mode Sensor

Buka file:

```text
backend/config.py
```

Untuk simulasi tanpa hardware:

```python
SENSOR_MODE = "mock"
```

Untuk membaca Arduino melalui USB Serial:

```python
SENSOR_MODE = "serial"
SERIAL_PORT = "COM5"
```

Sesuaikan port serial dengan port Arduino pada laptop.

## Akun Admin Demo

```text
Username: admin
Password: admin123
```

## Struktur Folder

```text
monitoring-jemuran/
├── arduino/
├── backend/
├── frontend/
├── hasil/
└── README.md
```

Folder `hasil/` digunakan untuk menyimpan dokumentasi project, seperti screenshot dashboard, foto hardware, dan bukti hasil pengujian.

## Repository

```text
Repository GitHub: [tambahkan link repository]
```
