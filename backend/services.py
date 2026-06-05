from __future__ import annotations

from typing import Any

from database import get_settings


def classify_sensor(sensor_value: int) -> dict[str, Any]:
    settings = get_settings()

    rain_threshold = int(settings["rain_threshold"])
    dry_threshold = int(settings["dry_threshold"])

    if sensor_value < rain_threshold:
        weather_status = "HUJAN"
        laundry_condition = "Segera angkat pakaian"
        color = "red"

    elif sensor_value <= dry_threshold:
        weather_status = "GERIMIS"
        laundry_condition = "Segera periksa jemuran"
        color = "yellow"

    else:
        weather_status = "CERAH"
        laundry_condition = "Jemuran aman"
        color = "green"

    return {
        "sensor_value": sensor_value,
        "weather_status": weather_status,
        "laundry_condition": laundry_condition,
        "color": color,
        "buzzer_active": (
            bool(settings["buzzer_enabled"])
            and weather_status == "HUJAN"
        ),
    }