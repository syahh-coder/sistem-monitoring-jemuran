import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash
from config import DATABASE_PATH, DEFAULT_SETTINGS

def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection(); c = conn.cursor(); now = datetime.now().isoformat(timespec='seconds')
    c.execute('CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS devices (id INTEGER PRIMARY KEY, device_name TEXT NOT NULL, serial_port TEXT NOT NULL, connection_status TEXT NOT NULL, last_seen_at TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS system_settings (id INTEGER PRIMARY KEY, dry_threshold INTEGER NOT NULL, rain_threshold INTEGER NOT NULL, buzzer_enabled INTEGER NOT NULL, read_interval INTEGER NOT NULL, serial_port TEXT NOT NULL, updated_at TEXT NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS weather_readings (id INTEGER PRIMARY KEY AUTOINCREMENT, sensor_value INTEGER NOT NULL, weather_status TEXT NOT NULL, laundry_condition TEXT NOT NULL, source TEXT NOT NULL, recorded_at TEXT NOT NULL)')
    c.execute('INSERT OR IGNORE INTO admins (username,password_hash,created_at) VALUES (?,?,?)', ('admin', generate_password_hash('admin123'), now))
    c.execute('INSERT OR IGNORE INTO devices VALUES (1,?,?,?,?)', ('Arduino Uno Jemuran', DEFAULT_SETTINGS['serial_port'], 'CONNECTED', now))
    c.execute('INSERT OR IGNORE INTO system_settings VALUES (1,?,?,?,?,?,?)', (DEFAULT_SETTINGS['dry_threshold'], DEFAULT_SETTINGS['rain_threshold'], 1, DEFAULT_SETTINGS['read_interval'], DEFAULT_SETTINGS['serial_port'], now))
    conn.commit(); conn.close()

def get_settings():
    conn=get_connection(); row=conn.execute('SELECT * FROM system_settings WHERE id=1').fetchone(); conn.close(); d=dict(row); d['buzzer_enabled']=bool(d['buzzer_enabled']); return d

def update_settings(data):
    cur=get_settings(); dry=int(data.get('dry_threshold',cur['dry_threshold'])); rain=int(data.get('rain_threshold',cur['rain_threshold'])); interval=int(data.get('read_interval',cur['read_interval'])); port=str(data.get('serial_port',cur['serial_port'])).strip() or cur['serial_port']; buz=bool(data.get('buzzer_enabled',cur['buzzer_enabled']))
    if not 0 <= rain < dry <= 1023: raise ValueError('Threshold harus memenuhi 0 <= rain_threshold < dry_threshold <= 1023.')
    if not 1 <= interval <= 60: raise ValueError('Interval harus 1-60 detik.')
    now=datetime.now().isoformat(timespec='seconds'); conn=get_connection(); conn.execute('UPDATE system_settings SET dry_threshold=?,rain_threshold=?,buzzer_enabled=?,read_interval=?,serial_port=?,updated_at=? WHERE id=1',(dry,rain,1 if buz else 0,interval,port,now)); conn.execute('UPDATE devices SET serial_port=? WHERE id=1',(port,)); conn.commit(); conn.close(); return get_settings()

def save_reading(sensor,status,condition,source):
    now=datetime.now().isoformat(timespec='seconds'); conn=get_connection(); conn.execute('INSERT INTO weather_readings(sensor_value,weather_status,laundry_condition,source,recorded_at) VALUES (?,?,?,?,?)',(sensor,status,condition,source,now)); conn.execute('UPDATE devices SET connection_status=?,last_seen_at=? WHERE id=1',('CONNECTED',now)); conn.commit(); conn.close()

def latest():
    conn=get_connection(); row=conn.execute('SELECT * FROM weather_readings ORDER BY recorded_at DESC,id DESC LIMIT 1').fetchone(); conn.close(); return dict(row) if row else None

def history(limit=100):
    conn=get_connection(); rows=conn.execute('SELECT * FROM weather_readings ORDER BY recorded_at DESC,id DESC LIMIT ?',(max(1,min(limit,500)),)).fetchall(); conn.close(); return [dict(r) for r in rows]

def delete_one(i):
    conn=get_connection(); cur=conn.execute('DELETE FROM weather_readings WHERE id=?',(i,)); conn.commit(); ok=cur.rowcount>0; conn.close(); return ok

def clear_all():
    conn=get_connection(); conn.execute('DELETE FROM weather_readings'); conn.commit(); conn.close()

def admin_by_username(username):
    conn=get_connection(); row=conn.execute('SELECT * FROM admins WHERE username=?',(username,)).fetchone(); conn.close(); return dict(row) if row else None

def device():
    conn=get_connection(); row=conn.execute('SELECT * FROM devices WHERE id=1').fetchone(); conn.close(); return dict(row)
def set_device_connection(status: str) -> None:
    conn = get_connection()

    conn.execute("""
        UPDATE devices
        SET connection_status = ?,
            last_seen_at = datetime('now', 'localtime')
        WHERE id = 1
    """, (status,))

    conn.commit()
    conn.close()