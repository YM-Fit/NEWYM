#!/usr/bin/env python3
"""
Tanita Scale → Supabase Integration Example

This script demonstrates how to send scale readings from a Tanita scale
to the Supabase database for real-time display in the YM Coach app.

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
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def send_scale_reading(weight_kg, body_fat_percent, fat_mass_kg, fat_free_mass_kg,
                       water_kg, water_percent, bmi):
    """
    Send scale reading data to Supabase.

    Args:
        weight_kg (float): Weight in kilograms
        body_fat_percent (float): Body fat percentage (0-100)
        fat_mass_kg (float): Fat mass in kilograms
        fat_free_mass_kg (float): Fat-free mass in kilograms
        water_kg (float): Water mass in kilograms
        water_percent (float): Water percentage (0-100)
        bmi (float): Body Mass Index

    Returns:
        dict: The inserted data from Supabase
    """
    data = {
        'weight_kg': weight_kg,
        'body_fat_percent': body_fat_percent,
        'fat_mass_kg': fat_mass_kg,
        'fat_free_mass_kg': fat_free_mass_kg,
        'water_kg': water_kg,
        'water_percent': water_percent,
        'bmi': bmi
    }

    try:
        result = supabase.table('scale_readings').insert(data).execute()
        print(f"✅ Data sent successfully at {datetime.now().strftime('%H:%M:%S')}")
        print(f"   Weight: {weight_kg} kg, Body Fat: {body_fat_percent}%")
        return result.data
    except Exception as e:
        print(f"❌ Error sending data: {e}")
        return None


def read_from_tanita_scale():
    """
    Read data from Tanita scale.

    This is a placeholder function. Replace with actual code to read
    from your Tanita scale via serial port, Bluetooth, or API.

    Returns:
        dict: Scale reading data
    """
    # TODO: Replace with actual Tanita scale reading code
    # Example for serial port:
    # import serial
    # ser = serial.Serial('/dev/ttyUSB0', 9600, timeout=1)
    # data = ser.readline().decode('utf-8').strip()
    # Parse data based on Tanita protocol...

    # For now, return mock data for testing
    return {
        'weight_kg': 85.3,
        'body_fat_percent': 18.5,
        'fat_mass_kg': 15.8,
        'fat_free_mass_kg': 69.5,
        'water_kg': 50.2,
        'water_percent': 58.8,
        'bmi': 24.7
    }


def main():
    """Main function to continuously monitor and send scale readings."""
    print("🎯 Tanita Scale Integration Started")
    print(f"📡 Connected to: {SUPABASE_URL}")
    print("⏳ Waiting for scale readings...\n")

    while True:
        try:
            # Read from scale
            reading = read_from_tanita_scale()

            if reading:
                # Send to Supabase
                send_scale_reading(
                    weight_kg=reading['weight_kg'],
                    body_fat_percent=reading['body_fat_percent'],
                    fat_mass_kg=reading['fat_mass_kg'],
                    fat_free_mass_kg=reading['fat_free_mass_kg'],
                    water_kg=reading['water_kg'],
                    water_percent=reading['water_percent'],
                    bmi=reading['bmi']
                )

            # Wait before next reading (adjust based on your needs)
            time.sleep(5)

        except KeyboardInterrupt:
            print("\n👋 Stopping scale integration...")
            break
        except Exception as e:
            print(f"⚠️ Unexpected error: {e}")
            time.sleep(5)


def send_test_reading():
    """Send a single test reading (useful for testing)."""
    print("🧪 Sending test reading...")
    send_scale_reading(
        weight_kg=85.3,
        body_fat_percent=18.5,
        fat_mass_kg=15.8,
        fat_free_mass_kg=69.5,
        water_kg=50.2,
        water_percent=58.8,
        bmi=24.7
    )


if __name__ == "__main__":
    # Uncomment one of these:

    # Option 1: Send single test reading
    send_test_reading()

    # Option 2: Run continuous monitoring
    # main()


# ============================================
# EXAMPLE: Reading from Tanita via Serial Port
# ============================================
"""
import serial

def read_tanita_serial(port='/dev/ttyUSB0', baudrate=9600):
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        print(f"Connected to {port}")

        while True:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8').strip()

                # Parse Tanita data format (example)
                # Format: W:085.3,F:18.5,M:69.5,...
                parts = line.split(',')
                data = {}

                for part in parts:
                    key, value = part.split(':')
                    if key == 'W':
                        data['weight_kg'] = float(value)
                    elif key == 'F':
                        data['body_fat_percent'] = float(value)
                    # ... parse other fields

                return data

    except serial.SerialException as e:
        print(f"Serial error: {e}")
        return None
    finally:
        if ser.is_open:
            ser.close()
"""


# ============================================
# EXAMPLE: Reading from Tanita via Bluetooth
# ============================================
"""
import asyncio
from bleak import BleakScanner, BleakClient

TANITA_DEVICE_NAME = "TANITA_BC"

async def read_tanita_bluetooth():
    print("Scanning for Tanita device...")
    devices = await BleakScanner.discover()

    tanita = None
    for device in devices:
        if device.name and TANITA_DEVICE_NAME in device.name:
            tanita = device
            break

    if not tanita:
        print("Tanita device not found")
        return None

    print(f"Found Tanita: {tanita.name}")

    async with BleakClient(tanita.address) as client:
        # Read characteristic (depends on Tanita BLE protocol)
        # UUID example: "00001234-0000-1000-8000-00805f9b34fb"
        data = await client.read_gatt_char("YOUR_CHARACTERISTIC_UUID")

        # Parse binary data
        weight = int.from_bytes(data[0:2], byteorder='little') / 10.0
        body_fat = int.from_bytes(data[2:4], byteorder='little') / 10.0

        return {
            'weight_kg': weight,
            'body_fat_percent': body_fat,
            # ... other fields
        }

# Run async function
# asyncio.run(read_tanita_bluetooth())
"""
