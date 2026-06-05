from __future__ import annotations

import json
import threading
import time
from typing import Callable

import serial

from config import BAUD_RATE
from database import get_settings, set_device_connection


class SerialSensor:
    def __init__(self, on_reading: Callable[[int, str], None]) -> None:
        self.on_reading = on_reading

        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

        self._serial: serial.Serial | None = None
        self._serial_lock = threading.Lock()

    def start(self) -> None:
        """
        Menjalankan pembacaan serial pada background thread.
        """

        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(
            target=self._run,
            daemon=True,
        )

        self._thread.start()

    def stop(self) -> None:
        """
        Menghentikan pembacaan serial.
        """

        self._stop_event.set()

    def send_settings(self, settings: dict) -> None:
        """
        Mengirim konfigurasi terbaru ke Arduino.

        Format:
        CFG,rain_threshold,dry_threshold,buzzer_enabled,interval_ms
        """

        if not self._serial or not self._serial.is_open:
            print("[SERIAL] Arduino belum terhubung. Settings belum dikirim.")
            return

        rain_threshold = int(settings["rain_threshold"])
        dry_threshold = int(settings["dry_threshold"])

        buzzer_enabled = (
            1 if settings["buzzer_enabled"] else 0
        )

        interval_ms = int(settings["read_interval"]) * 1000

        command = (
            f"CFG,"
            f"{rain_threshold},"
            f"{dry_threshold},"
            f"{buzzer_enabled},"
            f"{interval_ms}\n"
        )

        with self._serial_lock:
            self._serial.write(command.encode("utf-8"))
            self._serial.flush()

        print(f"[SERIAL] Settings dikirim: {command.strip()}")

    def _run(self) -> None:
        """
        Membuka koneksi Serial dan membaca data dari Arduino.
        """

        while not self._stop_event.is_set():
            try:
                port = str(get_settings()["serial_port"])

                with serial.Serial(
                    port=port,
                    baudrate=BAUD_RATE,
                    timeout=1,
                ) as arduino:
                    self._serial = arduino

                    print(f"[SERIAL] Arduino terhubung di {port}")
                    set_device_connection("CONNECTED")

                    # Kirim settings saat Arduino pertama kali terhubung.
                    self.send_settings(get_settings())

                    while not self._stop_event.is_set():
                        line = arduino.readline().decode(
                            "utf-8",
                            errors="ignore",
                        ).strip()

                        if not line:
                            continue

                        print(f"[SERIAL] Raw: {line}")

                        # Pesan konfirmasi Arduino.
                        if line == "CFG_OK":
                            print("[SERIAL] Arduino menerima settings.")
                            continue

                        # Abaikan pesan selain JSON.
                        if not line.startswith("{"):
                            continue

                        data = json.loads(line)

                        sensor_value = int(data["sensor"])

                        if not 0 <= sensor_value <= 1023:
                            raise ValueError(
                                "Nilai sensor di luar rentang 0-1023."
                            )

                        self.on_reading(
                            sensor_value,
                            "serial",
                        )

            except Exception as error:
                print(f"[SERIAL] Koneksi gagal: {error}")

                self._serial = None
                set_device_connection("DISCONNECTED")

                time.sleep(5)