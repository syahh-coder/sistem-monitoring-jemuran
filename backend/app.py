from __future__ import annotations

from functools import wraps
from typing import Any, Callable

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import check_password_hash

from config import HOST, PORT, SECRET_KEY, SENSOR_MODE
from database import (
    admin_by_username,
    clear_all,
    delete_one,
    device,
    get_settings,
    history,
    init_db,
    latest,
    save_reading,
    update_settings,
)
from mock_sensor import MockSensor
from serial_reader import SerialSensor


# ============================================================
# KONFIGURASI FLASK
# ============================================================

app = Flask(__name__)
app.secret_key = SECRET_KEY

# Mengizinkan frontend React mengakses backend Flask.
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        }
    },
    supports_credentials=True,
)

# Runner menyimpan sumber data aktif:
# - MockSensor untuk simulasi
# - SerialSensor untuk Arduino asli
runner: Any = None


# ============================================================
# AUTENTIKASI ADMIN
# ============================================================

def auth_required(function: Callable[..., Any]) -> Callable[..., Any]:
    """
    Membatasi endpoint agar hanya dapat diakses oleh admin
    yang sudah melakukan login.
    """

    @wraps(function)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        if not session.get("admin_id"):
            return jsonify({
                "error": "Login admin diperlukan."
            }), 401

        return function(*args, **kwargs)

    return wrapper


# ============================================================
# LOGIKA KLASIFIKASI SENSOR
# ============================================================

def classify_sensor(sensor_value: int) -> dict[str, Any]:
    """
    Menentukan status cuaca berdasarkan nilai analog sensor.

    Nilai analog:
    - Lebih kecil dari rain_threshold  : HUJAN
    - Sampai dry_threshold             : GERIMIS
    - Lebih besar dari dry_threshold   : CERAH
    """

    settings = get_settings()

    rain_threshold = int(settings["rain_threshold"])
    dry_threshold = int(settings["dry_threshold"])

    if sensor_value < rain_threshold:
        status = "HUJAN"
        condition = "Segera angkat pakaian"

    elif sensor_value <= dry_threshold:
        status = "GERIMIS"
        condition = "Segera periksa jemuran"

    else:
        status = "CERAH"
        condition = "Jemuran aman"

    return {
        "status": status,
        "condition": condition,
    }


def process_reading(sensor_value: int, source: str) -> None:
    """
    Memproses data yang diterima dari mock sensor atau Arduino.

    Fungsi ini:
    1. Memvalidasi nilai sensor.
    2. Mengklasifikasikan kondisi cuaca.
    3. Menyimpan data ke database SQLite.
    """

    if not 0 <= sensor_value <= 1023:
        raise ValueError(
            "Nilai sensor harus berada pada rentang 0–1023."
        )

    classified = classify_sensor(sensor_value)

    # Gunakan positional arguments agar konsisten dengan database.py.
    save_reading(
        sensor_value,
        classified["status"],
        classified["condition"],
        source,
    )


# ============================================================
# ENDPOINT PUBLIK
# ============================================================

@app.get("/api/health")
def health() -> Any:
    """
    Mengecek apakah backend aktif.
    """

    return jsonify({
        "ok": True,
        "message": "Backend monitoring jemuran aktif.",
        "sensor_mode": SENSOR_MODE,
    })


@app.get("/api/status")
def status() -> Any:
    """
    Mengambil data kondisi jemuran terbaru.
    Endpoint ini digunakan oleh dashboard React.
    """

    reading = latest()

    # Nilai default ketika database belum memiliki data.
    if reading is None:
        reading = {
            "sensor_value": None,
            "weather_status": "BELUM ADA DATA",
            "laundry_condition": "Menunggu data sensor",
            "recorded_at": None,
            "source": SENSOR_MODE,
        }

    current_device = device()
    settings = get_settings()

    colors = {
        "CERAH": "green",
        "GERIMIS": "yellow",
        "HUJAN": "red",
    }

    buzzer_active = (
        bool(settings["buzzer_enabled"])
        and reading["weather_status"] == "HUJAN"
    )

    return jsonify({
        "sensor": reading["sensor_value"],
        "status": reading["weather_status"],
        "laundry_condition": reading["laundry_condition"],
        "color": colors.get(reading["weather_status"], "gray"),
        "buzzer_active": buzzer_active,
        "device_connected": (
            current_device["connection_status"] == "CONNECTED"
        ),
        "device_status": current_device["connection_status"],
        "updated_at": reading["recorded_at"],
        "source": reading["source"],
    })


@app.get("/api/history")
def get_history() -> Any:
    """
    Mengambil riwayat kondisi cuaca dari database.
    """

    try:
        limit = int(request.args.get("limit", 100))
    except ValueError:
        return jsonify({
            "error": "Parameter limit harus berupa angka."
        }), 400

    return jsonify(history(limit))


# ============================================================
# ENDPOINT MOCK SENSOR
# ============================================================

@app.post("/api/mock/status")
def set_mock_status() -> Any:
    """
    Mengubah nilai simulasi sensor secara manual.

    Endpoint ini hanya dapat digunakan ketika:
    SENSOR_MODE = "mock"
    """

    global runner

    if SENSOR_MODE != "mock":
        return jsonify({
            "error": "Endpoint hanya tersedia pada mock mode."
        }), 400

    payload = request.get_json(silent=True) or {}

    try:
        sensor_value = int(payload["sensor"])
    except (KeyError, TypeError, ValueError):
        return jsonify({
            "error": "Field sensor wajib berupa angka."
        }), 400

    if not 0 <= sensor_value <= 1023:
        return jsonify({
            "error": "Nilai sensor harus berada pada rentang 0–1023."
        }), 400

    runner.set_manual(sensor_value)
    process_reading(sensor_value, "mock-manual")

    return jsonify({
        "ok": True,
        "sensor": sensor_value,
    })


@app.post("/api/mock/auto")
def set_mock_auto() -> Any:
    """
    Mengaktifkan kembali pergantian status otomatis pada mock mode.
    """

    global runner

    if SENSOR_MODE != "mock":
        return jsonify({
            "error": "Endpoint hanya tersedia pada mock mode."
        }), 400

    runner.set_manual(None)

    return jsonify({
        "ok": True,
        "message": "Mode mock otomatis diaktifkan.",
    })


# ============================================================
# ENDPOINT LOGIN ADMIN
# ============================================================

@app.post("/api/login")
def login() -> Any:
    """
    Memverifikasi username dan password admin.
    """

    payload = request.get_json(silent=True) or {}

    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    admin = admin_by_username(username)

    if (
        not admin
        or not check_password_hash(
            admin["password_hash"],
            password,
        )
    ):
        return jsonify({
            "error": "Username atau password salah."
        }), 401

    session["admin_id"] = admin["id"]
    session["username"] = admin["username"]

    return jsonify({
        "ok": True,
        "username": admin["username"],
    })


@app.post("/api/logout")
def logout() -> Any:
    """
    Menghapus session admin.
    """

    session.clear()

    return jsonify({
        "ok": True,
    })


@app.get("/api/session")
def get_session() -> Any:
    """
    Mengecek apakah admin sudah login.
    """

    return jsonify({
        "authenticated": bool(session.get("admin_id")),
        "username": session.get("username"),
    })


# ============================================================
# ENDPOINT SETTINGS ADMIN
# ============================================================

@app.get("/api/settings")
@auth_required
def get_system_settings() -> Any:
    """
    Mengambil konfigurasi sistem.
    """

    return jsonify(get_settings())


@app.put("/api/settings")
@auth_required
def update_system_settings() -> Any:
    """
    Memperbarui threshold, interval, port serial, dan buzzer.
    """

    payload = request.get_json(silent=True) or {}

    try:
        settings = update_settings(payload)

    except ValueError as error:
        return jsonify({
            "error": str(error)
        }), 400

    return jsonify({
        "ok": True,
        "settings": settings,
    })


# ============================================================
# ENDPOINT KELOLA RIWAYAT ADMIN
# ============================================================

@app.delete("/api/history/<int:reading_id>")
@auth_required
def delete_history_item(reading_id: int) -> Any:
    """
    Menghapus satu data riwayat berdasarkan ID.
    """

    deleted = delete_one(reading_id)

    if not deleted:
        return jsonify({
            "error": "Data tidak ditemukan."
        }), 404

    return jsonify({
        "ok": True,
    })


@app.delete("/api/history")
@auth_required
def clear_history() -> Any:
    """
    Menghapus seluruh riwayat kondisi cuaca.
    """

    clear_all()

    return jsonify({
        "ok": True,
    })


# ============================================================
# MENJALANKAN BACKEND
# ============================================================

if __name__ == "__main__":
    # Membuat tabel database jika belum tersedia.
    init_db()

    # Menentukan sumber data berdasarkan SENSOR_MODE.
    if SENSOR_MODE == "mock":
        runner = MockSensor(process_reading)

    elif SENSOR_MODE == "serial":
        runner = SerialSensor(process_reading)

    else:
        raise ValueError(
            "SENSOR_MODE harus bernilai 'mock' atau 'serial'."
        )

    # Menjalankan pembacaan sensor pada background thread.
    runner.start()

    # Menjalankan REST API Flask.
    app.run(
        host=HOST,
        port=PORT,
        debug=False,
    )
