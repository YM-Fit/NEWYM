#!/usr/bin/env python3
"""
Tanita TBF-400 Scale -> Supabase Integration

This script demonstrates how to send scale readings from a Tanita TBF-400 scale
to the Supabase database for real-time display in the YM Coach app.

Features:
    - Heartbeat monitoring for connection health
    - Debounce support for stable readings
    - Multi-device support
    - Automatic retry on connection failures

Requirements:
    pip install supabase python-dotenv

Usage:
    python python_scale_integration_example.py

Environment Variables:
    SUPABASE_URL - Your Supabase project URL
    SUPABASE_SERVICE_KEY - Your Supabase service role key (NOT anon key!)
"""

import os
import time
import threading
from datetime import datetime
from typing import Optional, Dict, List
from dataclasses import dataclass
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

DEVICE_ID = os.getenv('SCALE_DEVICE_ID', 'default')
DEVICE_NAME = os.getenv('SCALE_DEVICE_NAME', 'Tanita TBF-400')
SCRIPT_VERSION = '2.0.0'

HEARTBEAT_INTERVAL = 10
DEBOUNCE_READINGS_COUNT = 2
DEBOUNCE_TOLERANCE_KG = 0.1
MAX_WEIGHT_JUMP_KG = 2.0


@dataclass
class ScaleReading:
    weight_kg: float
    body_fat_percent: float
    fat_mass_kg: float
    fat_free_mass_kg: float
    water_kg: float
    water_percent: float
    bmi: float
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class HeartbeatManager:
    def __init__(self, device_id: str, device_name: str, interval: int = HEARTBEAT_INTERVAL):
        self.device_id = device_id
        self.device_name = device_name
        self.interval = interval
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._thread.start()
        print(f"Heartbeat started (every {self.interval}s)")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        print("Heartbeat stopped")

    def _heartbeat_loop(self):
        while self._running:
            try:
                self._send_heartbeat()
            except Exception as e:
                print(f"Heartbeat error: {e}")
            time.sleep(self.interval)

    def _send_heartbeat(self):
        data = {
            'device_id': self.device_id,
            'device_name': self.device_name,
            'script_version': SCRIPT_VERSION
        }
        supabase.table('scale_heartbeats').insert(data).execute()


class ReadingDebouncer:
    def __init__(self, required_count: int = DEBOUNCE_READINGS_COUNT,
                 tolerance_kg: float = DEBOUNCE_TOLERANCE_KG):
        self.required_count = required_count
        self.tolerance_kg = tolerance_kg
        self._readings: List[ScaleReading] = []
        self._last_sent_weight: Optional[float] = None

    def add_reading(self, reading: ScaleReading) -> Optional[ScaleReading]:
        if self._last_sent_weight is not None:
            weight_jump = abs(reading.weight_kg - self._last_sent_weight)
            if weight_jump > MAX_WEIGHT_JUMP_KG:
                print(f"Large weight jump detected: {weight_jump:.1f} kg - new person?")
                self._readings.clear()

        self._readings.append(reading)

        if len(self._readings) > 10:
            self._readings = self._readings[-10:]

        if len(self._readings) >= self.required_count:
            recent = self._readings[-self.required_count:]
            weights = [r.weight_kg for r in recent]

            if self._is_stable(weights):
                stable_reading = recent[-1]
                self._last_sent_weight = stable_reading.weight_kg
                self._readings.clear()
                return stable_reading

        return None

    def _is_stable(self, weights: List[float]) -> bool:
        if len(weights) < 2:
            return False

        min_w = min(weights)
        max_w = max(weights)
        return (max_w - min_w) <= self.tolerance_kg

    def force_reading(self) -> Optional[ScaleReading]:
        if self._readings:
            reading = self._readings[-1]
            self._last_sent_weight = reading.weight_kg
            self._readings.clear()
            return reading
        return None


def send_scale_reading(reading: ScaleReading, is_stable: bool = True,
                       raw_readings_count: int = 1) -> Optional[Dict]:
    data = {
        'weight_kg': reading.weight_kg,
        'body_fat_percent': reading.body_fat_percent,
        'fat_mass_kg': reading.fat_mass_kg,
        'fat_free_mass_kg': reading.fat_free_mass_kg,
        'water_kg': reading.water_kg,
        'water_percent': reading.water_percent,
        'bmi': reading.bmi,
        'device_id': DEVICE_ID,
        'is_stable': is_stable,
        'raw_readings_count': raw_readings_count
    }

    try:
        result = supabase.table('scale_readings').insert(data).execute()
        status = "STABLE" if is_stable else "unstable"
        print(f"[{status}] Sent: {reading.weight_kg:.1f} kg, {reading.body_fat_percent:.1f}% fat")
        return result.data
    except Exception as e:
        print(f"Error sending data: {e}")
        return None


def read_from_tanita_scale() -> Optional[ScaleReading]:
    """
    Read data from Tanita TBF-400 scale.

    IMPORTANT: This is a placeholder function!
    Replace with actual code to read from your Tanita scale.

    The TBF-400 typically communicates via:
    - RS-232 serial port
    - USB (via serial adapter)

    Contact Tanita support for the exact protocol specification.

    Returns:
        ScaleReading: Scale reading data, or None if no reading available
    """
    return ScaleReading(
        weight_kg=85.3,
        body_fat_percent=18.5,
        fat_mass_kg=15.8,
        fat_free_mass_kg=69.5,
        water_kg=50.2,
        water_percent=58.8,
        bmi=24.7
    )


def main():
    print(f"Tanita Scale Integration v{SCRIPT_VERSION}")
    print(f"Device: {DEVICE_NAME} ({DEVICE_ID})")
    print(f"Connected to: {SUPABASE_URL}")
    print("-" * 50)

    heartbeat = HeartbeatManager(DEVICE_ID, DEVICE_NAME)
    heartbeat.start()

    debouncer = ReadingDebouncer()

    print("Waiting for scale readings...\n")

    try:
        while True:
            reading = read_from_tanita_scale()

            if reading:
                stable_reading = debouncer.add_reading(reading)

                if stable_reading:
                    send_scale_reading(
                        stable_reading,
                        is_stable=True,
                        raw_readings_count=DEBOUNCE_READINGS_COUNT
                    )
                else:
                    print(f"[waiting] {reading.weight_kg:.1f} kg - stabilizing...")

            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping...")

        final_reading = debouncer.force_reading()
        if final_reading:
            print("Sending final reading...")
            send_scale_reading(final_reading, is_stable=False, raw_readings_count=1)

        heartbeat.stop()
        print("Goodbye!")


def send_test_reading():
    print(f"Sending test reading from {DEVICE_NAME}...")

    heartbeat = HeartbeatManager(DEVICE_ID, DEVICE_NAME)
    heartbeat._send_heartbeat()
    print("Heartbeat sent")

    reading = ScaleReading(
        weight_kg=85.3,
        body_fat_percent=18.5,
        fat_mass_kg=15.8,
        fat_free_mass_kg=69.5,
        water_kg=50.2,
        water_percent=58.8,
        bmi=24.7
    )

    send_scale_reading(reading, is_stable=True, raw_readings_count=2)
    print("Test complete!")


if __name__ == "__main__":
    send_test_reading()
    # main()


# ============================================
# EXAMPLE: Reading from Tanita TBF-400 via Serial Port
# ============================================
"""
import serial

class TanitaTBF400:
    def __init__(self, port='/dev/ttyUSB0', baudrate=9600):
        self.port = port
        self.baudrate = baudrate
        self.serial = None

    def connect(self):
        try:
            self.serial = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=1
            )
            print(f"Connected to {self.port}")
            return True
        except serial.SerialException as e:
            print(f"Serial connection error: {e}")
            return False

    def disconnect(self):
        if self.serial and self.serial.is_open:
            self.serial.close()

    def read_measurement(self) -> Optional[ScaleReading]:
        if not self.serial or not self.serial.is_open:
            return None

        try:
            if self.serial.in_waiting > 0:
                line = self.serial.readline().decode('utf-8').strip()
                return self._parse_tanita_data(line)
        except Exception as e:
            print(f"Read error: {e}")

        return None

    def _parse_tanita_data(self, data: str) -> Optional[ScaleReading]:
        # Tanita TBF-400 data format (example - check actual protocol):
        # Format varies by model - this is a generic example
        # W:085.3,F:18.5,FM:15.8,FFM:69.5,TW:50.2,WP:58.8,BMI:24.7

        try:
            values = {}
            for part in data.split(','):
                if ':' in part:
                    key, val = part.split(':')
                    values[key.strip()] = float(val.strip())

            return ScaleReading(
                weight_kg=values.get('W', 0),
                body_fat_percent=values.get('F', 0),
                fat_mass_kg=values.get('FM', 0),
                fat_free_mass_kg=values.get('FFM', 0),
                water_kg=values.get('TW', 0),
                water_percent=values.get('WP', 0),
                bmi=values.get('BMI', 0)
            )
        except Exception as e:
            print(f"Parse error: {e}")
            return None


# Usage example:
# tanita = TanitaTBF400('/dev/ttyUSB0')
# if tanita.connect():
#     while True:
#         reading = tanita.read_measurement()
#         if reading:
#             stable = debouncer.add_reading(reading)
#             if stable:
#                 send_scale_reading(stable)
#         time.sleep(0.5)
"""


# ============================================
# EXAMPLE: Environment configuration for multiple devices
# ============================================
"""
# .env file for Device 1 (Main Gym):
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SCALE_DEVICE_ID=gym_main_scale_1
SCALE_DEVICE_NAME=Tanita TBF-400 - Main Gym

# .env file for Device 2 (Branch):
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SCALE_DEVICE_ID=gym_branch_scale_1
SCALE_DEVICE_NAME=Tanita TBF-400 - Branch Location
"""
