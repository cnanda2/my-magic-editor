# ============================================
# Example: Weather Station
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Advanced
# ============================================
# Description:
#   Read temperature and light level, display on
#   serial monitor, and indicate conditions with LEDs.
#   Logs data over time for analysis.
#
# Circuit:
#   - LM35 temperature sensor on A0
#   - LDR (light sensor) on A1
#   - Green LED on pin 11 (good weather)
#   - Yellow LED on pin 12 (cloudy)
#   - Red LED on pin 13 (hot alert)
#
# Concepts learned:
#   - Multiple analog sensors
#   - Data logging
#   - Threshold-based decisions
#   - Formatted output
# ============================================

TEMP_PIN = 0        # A0
LIGHT_PIN = 1       # A1
GREEN_LED = 11
YELLOW_LED = 12
RED_LED = 13

# Thresholds
HOT_TEMP = 35       # Celsius
WARM_TEMP = 25
DARK_LEVEL = 300    # LDR reading

def all_leds_off():
    digital_write(GREEN_LED, 0)
    digital_write(YELLOW_LED, 0)
    digital_write(RED_LED, 0)

print("🌤️ Weather Station")
print("=" * 40)
print(f"{'Time':<6} {'Temp(°C)':<10} {'Light':<8} {'Condition'}")
print("-" * 40)

data_log = []

for reading in range(20):
    # Read sensors
    temp_raw = analog_read(TEMP_PIN)
    light_raw = analog_read(LIGHT_PIN)

    # Convert temperature (LM35)
    temperature = (temp_raw * 500) / 1023

    # Determine weather condition
    all_leds_off()

    if temperature > HOT_TEMP:
        condition = "🔴 HOT!"
        digital_write(RED_LED, 1)
    elif temperature > WARM_TEMP and light_raw > DARK_LEVEL:
        condition = "🟢 Sunny"
        digital_write(GREEN_LED, 1)
    elif light_raw < DARK_LEVEL:
        condition = "🟡 Cloudy"
        digital_write(YELLOW_LED, 1)
    else:
        condition = "🟢 Normal"
        digital_write(GREEN_LED, 1)

    # Log data
    time_str = f"{reading * 2}s"
    data_log.append((temperature, light_raw))
    print(f"{time_str:<6} {temperature:<10.1f} {light_raw:<8} {condition}")

    delay(2000)

# Summary
print("\n" + "=" * 40)
print("📊 Summary:")
temps = [d[0] for d in data_log]
print(f"  Min temp: {min(temps):.1f}°C")
print(f"  Max temp: {max(temps):.1f}°C")
print(f"  Avg temp: {sum(temps)/len(temps):.1f}°C")
print(f"  Readings: {len(data_log)}")

all_leds_off()
print("Station stopped.")
