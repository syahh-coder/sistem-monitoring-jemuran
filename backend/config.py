from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / 'jemuran.db'
SENSOR_MODE = 'serial'  # ubah ke 'serial' besok setelah kode serial diaktifkan
SERIAL_PORT = 'COM5'
BAUD_RATE = 9600
HOST = '127.0.0.1'
PORT = 5000
SECRET_KEY = 'dev-secret-change-before-deployment'
DEFAULT_SETTINGS = {
    'dry_threshold': 800,
    'rain_threshold': 400,
    'buzzer_enabled': True,
    'read_interval': 2,
    'serial_port': SERIAL_PORT,
}
