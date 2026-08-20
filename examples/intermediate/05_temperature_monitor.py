# ============================================
# Example: Temperature Monitor
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Intermediate
# ============================================
# Description:
#   Read temperature from a sensor and display it.
#   Turn on warning LED if temperature is too high.
#
# Circuit (LM35):
#   - LM35 Vout -> Arduino A0
#   - LM35 VCC -> 5V
#   - LM35 GND -> GND
#   - Red LED on pin 12 (hot warning)
#   - Green LED on pin 11 (normal)
#
# Circuit (DHT11):
#   - DHT11 Data -> Arduino pin 2
#   - DHT11 VCC -> 5V
#   - DHT11 GND -> GND
#
# Blocks equivalent:
#   [set variable temp to (temperature pin A0 sensor LM35)]
#   [if <temp > 30> then]
#     [digital write pin 12 HIGH]
#   [else]
#     [digital write pin 11 HIGH]
# ============================================

TEMP_PIN = 0        # Analog pin A0 (for LM35)
RED_LED = 12        # Hot warning
GREEN_LED = 11      # Normal temperature
THRESHOLD = 30      # Temperature threshold in Celsius

print("Temperature Monitor")
print("=" * 30)

for i in range(15):
    # Read analog value from LM35
    raw_value = analog_read(TEMP_PIN)

    # Convert to temperature (LM35: 10mV per degree)
    # Arduino: (raw / 1023) * 5000 / 10
    temperature = (raw_value * 500) / 1023

    print(f"  🌡️ Temperature: {temperature:.1f}°C")

    if temperature > THRESHOLD:
        digital_write(RED_LED, 1)
        digital_write(GREEN_LED, 0)
        print(f"  🔴 WARNING: Too hot! (>{THRESHOLD}°C)")
    else:
        digital_write(RED_LED, 0)
        digital_write(GREEN_LED, 1)
        print(f"  🟢 Normal temperature")

    delay(2000)

digital_write(RED_LED, 0)
digital_write(GREEN_LED, 0)
print("Monitoring complete!")
