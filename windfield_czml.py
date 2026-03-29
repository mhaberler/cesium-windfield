#!/usr/bin/env python3
"""
Generate a time-animated wind field CZML from Open-Meteo forecast data.

Replicates the logic of the cesium-windfield TypeScript application.

Usage:
    python windfield_czml.py <lat> <lon> [options]

Examples:
    python windfield_czml.py 47.0 15.0
    python windfield_czml.py 47.0 15.0 --hours 6 --output test.czml
    python windfield_czml.py 47.0 15.0 --model icon_d2 --factor 20 --box 0.05
"""

import argparse
import datetime as dt
import json
import math
import sys

import requests
from geographiclib.geodesic import Geodesic

from czml3 import CZML_VERSION, Document, Packet
from czml3.enums import ClockRanges, ClockSteps
from czml3.properties import (
    Clock,
    Color,
    Polyline,
    PolylineArrowMaterial,
    PolylineMaterial,
    Position,
    PositionList,
)
from czml3.types import IntervalValue, ReferenceListValue

# ---------------------------------------------------------------------------
# Pressure levels: (API key suffix, approximate altitude in metres)
# Identical to the TypeScript source.
# ---------------------------------------------------------------------------

PRESSURE_LEVELS = [
    {"key": "10m",     "alt": 10},
    {"key": "1000hPa", "alt": 110},
    {"key": "975hPa",  "alt": 320},
    {"key": "950hPa",  "alt": 500},
    {"key": "925hPa",  "alt": 800},
    {"key": "900hPa",  "alt": 1000},
    {"key": "850hPa",  "alt": 1500},
    {"key": "700hPa",  "alt": 3000},
    {"key": "600hPa",  "alt": 4200},
    {"key": "500hPa",  "alt": 5500},
]

# ---------------------------------------------------------------------------
# Jet colormap (101 shades, matching npm colormap package output)
# ---------------------------------------------------------------------------

def _jet_color(t: float) -> list[float]:
    """Map t in [0, 1] to RGBA using the jet colormap."""
    t = max(0.0, min(1.0, t))
    if t < 0.125:
        r, g, b = 0.0, 0.0, 0.5 + 4.0 * t
    elif t < 0.375:
        r, g, b = 0.0, 4.0 * (t - 0.125), 1.0
    elif t < 0.625:
        r, g, b = 4.0 * (t - 0.375), 1.0, 1.0 - 4.0 * (t - 0.375)
    elif t < 0.875:
        r, g, b = 1.0, 1.0 - 4.0 * (t - 0.625), 0.0
    else:
        r, g, b = 1.0 - 4.0 * (t - 0.875), 0.0, 0.0
    return [r, g, b, 1.0]


# Pre-compute 101 shades (indices 0–100) at module load time.
_JET_COLORS: list[list[float]] = [_jet_color(i / 100.0) for i in range(101)]


def value_to_jet_rgb(speed: float) -> list[float]:
    """Return jet RGBA [0–1] for a wind speed (m/s), capped at index 100."""
    idx = min(100, max(0, round(float(speed))))
    return _JET_COLORS[idx]


# ---------------------------------------------------------------------------
# Geodesic endpoint calculation (mirrors endpoint.ts / geographiclib)
# ---------------------------------------------------------------------------

_GEOD = Geodesic.WGS84


def get_endpoint(lat1: float, lon1: float, bearing: float, distance_m: float) -> tuple[float, float]:
    """Return (lat2, lon2) of the destination point using WGS84 geodesic."""
    result = _GEOD.Direct(lat1, lon1, bearing, distance_m)
    return result["lat2"], result["lon2"]


# ---------------------------------------------------------------------------
# Open-Meteo fetch
# ---------------------------------------------------------------------------

def fetch_wind_data(lat: float, lon: float, model: str, forecast_hours: int, box: float) -> list[dict]:
    """Fetch hourly wind data from Open-Meteo for a bounding box.

    Returns a list of location dicts (one per grid point), each with
    ``latitude``, ``longitude``, ``hourly``, and ``hourly_units``.
    """
    params = ",".join(
        f"wind_speed_{p['key']},wind_direction_{p['key']}"
        for p in PRESSURE_LEVELS
    )
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?hourly={params},"
        f"&bounding_box={lat - box},{lon - box},{lat + box},{lon + box}"
        f"&models={model}"
        f"&forecast_hours={forecast_hours}"
    )
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    data = response.json()
    # API returns a list when bounding_box is used.
    if isinstance(data, dict):
        data = [data]
    return data


# ---------------------------------------------------------------------------
# CZML generation
# ---------------------------------------------------------------------------

def generate_czml(
    data: list[dict],
    lat: float,
    lon: float,
    model: str,
    factor: float,
) -> Document:
    """Build a czml3 Document replicating the TypeScript wind-field CZML."""

    t0_str: str = data[0]["hourly"]["time"][0]
    t_end_str: str = data[0]["hourly"]["time"][-1]
    t0 = dt.datetime.fromisoformat(t0_str)

    packets: list[Packet] = [
        Packet(
            id="document",
            name=f"Windfield {model} {lat}/{lon} {t0_str}",
            version=CZML_VERSION,
            clock=IntervalValue(
                start=t0_str,
                end=t_end_str,
                value=Clock(
                    currentTime=t0_str,
                    multiplier=3600,
                    range=ClockRanges.LOOP_STOP,
                    step=ClockSteps.SYSTEM_CLOCK_MULTIPLIER,
                ),
            ),
        )
    ]

    for locidx, loc in enumerate(data):
        loc_lat: float = loc["latitude"]
        loc_lon: float = loc["longitude"]
        hourly: dict = loc["hourly"]
        hourly_units: dict = loc.get("hourly_units", {})
        times: list[str] = hourly["time"]

        for levidx, level in enumerate(PRESSURE_LEVELS):
            key: str = level["key"]
            alt: float = level["alt"]
            speed_key = f"wind_speed_{key}"
            dir_key = f"wind_direction_{key}"

            # --- Static start position ---
            packets.append(
                Packet(
                    id=f"start:{locidx}:{levidx}",
                    position=Position(
                        cartographicDegrees=[loc_lon, loc_lat, float(alt)]
                    ),
                )
            )

            # Build the cumulative positions array (time-tagged endpoint series).
            # All end entities will receive the complete array, replicating the
            # JavaScript reference-semantics behaviour of the TypeScript source.
            positions: list[float] = []

            speed_series: list = hourly.get(speed_key, [])
            dir_series: list = hourly.get(dir_key, [])
            speed_unit: str = hourly_units.get(speed_key, "m/s")
            dir_unit: str = hourly_units.get(dir_key, "°")

            for timeidx, time_str in enumerate(times):
                now = dt.datetime.fromisoformat(time_str)
                secs = (now - t0).total_seconds()

                speed = speed_series[timeidx] if timeidx < len(speed_series) else None
                direction = dir_series[timeidx] if timeidx < len(dir_series) else None

                if speed and direction:
                    endpoint_lat, endpoint_lon = get_endpoint(
                        loc_lat, loc_lon, direction, speed * factor
                    )
                    positions.extend([secs, endpoint_lon, endpoint_lat, float(alt)])

                    color_rgbaf = value_to_jet_rgb(speed)

                    packets.append(
                        Packet(
                            id=f"{locidx}_{levidx}_{timeidx}",
                            name=f"{key}/{alt}m {speed}{speed_unit}/{direction}{dir_unit}",
                            polyline=Polyline(
                                positions=PositionList(
                                    references=ReferenceListValue(
                                        values=[
                                            f"start:{locidx}:{levidx}#position",
                                            f"end:{locidx}:{levidx}:{timeidx}#position",
                                        ]
                                    )
                                ),
                                width=7,
                                material=PolylineMaterial(
                                    polylineArrow=PolylineArrowMaterial(
                                        color=Color(rgbaf=color_rgbaf)
                                    )
                                ),
                            ),
                        )
                    )

                # End position: carries the accumulated (full) positions series.
                # Only created when at least one valid position exists.
                if positions:
                    packets.append(
                        Packet(
                            id=f"end:{locidx}:{levidx}:{timeidx}",
                            position=Position(
                                epoch=t0_str,
                                cartographicDegrees=list(positions),
                            ),
                        )
                    )

    return Document(packets=packets)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch Open-Meteo wind data and generate a Cesium CZML wind field.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("lat",  type=float, help="Centre latitude (degrees)")
    parser.add_argument("lon",  type=float, help="Centre longitude (degrees)")
    parser.add_argument("--model",  default="icon_d2",  help="Open-Meteo weather model")
    parser.add_argument("--hours",  type=int,   default=24,   help="Forecast hours to fetch")
    parser.add_argument("--factor", type=float, default=20.0, help="Wind speed multiplier for arrow length")
    parser.add_argument("--box",    type=float, default=0.05, help="Bounding-box half-width in degrees")
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output .czml filename (default: windfield_<lat>_<lon>.czml)",
    )
    args = parser.parse_args()

    output = args.output or f"windfield_{args.lat}_{args.lon}.czml"

    print(f"Fetching wind data for ({args.lat}, {args.lon}) …", file=sys.stderr)
    data = fetch_wind_data(args.lat, args.lon, args.model, args.hours, args.box)
    print(f"  Received {len(data)} grid point(s), {len(data[0]['hourly']['time'])} time step(s).", file=sys.stderr)

    print("Generating CZML …", file=sys.stderr)
    doc = generate_czml(data, args.lat, args.lon, args.model, args.factor)

    with open(output, "w") as fh:
        fh.write(str(doc))

    packet_count = len(doc.packets)
    print(f"Wrote {packet_count} packets → {output}", file=sys.stderr)


if __name__ == "__main__":
    main()
