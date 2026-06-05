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

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(
            target=self._run,
            daemon=True
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    def _run(self) -> None:
        while not self._stop_event.is_set():
            try:
                port = str(get_settings()["serial_port"])

                with serial.Serial(
                    port,
                    BAUD_RATE,
                    timeout=1
                ) as arduino:
                    print(f"[SERIAL] Arduino terhubung di {port}")
                    set_device_connection("CONNECTED")

                    while not self._stop_event.is_set():
                        line = arduino.readline().decode(
                            "utf-8"
                        ).strip()

                        if not line:
                            continue

                        print(f"[SERIAL] Raw: {line}")

                        data = json.loads(line)
                        sensor_value = int(data["sensor"])

                        if not 0 <= sensor_value <= 1023:
                            raise ValueError(
                                "Nilai sensor di luar rentang 0–1023."
                            )

                        self.on_reading(
                            sensor_value,
                            "serial"
                        )

            except Exception as error:
                print(f"[SERIAL] Koneksi gagal: {error}")
                set_device_connection("DISCONNECTED")
                time.sleep(5)