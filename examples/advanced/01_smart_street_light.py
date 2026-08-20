# ============================================
# Example: Smart Street Light
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Advanced
# ============================================
# Description:
#   Automatic street light that turns ON when dark
#   and OFF when bright. Uses LDR for light sensing
#   and PWM for gradual brightness control.
#   Also detects motion with ultrasonic sensor to
#   increase brightness when someone is near.
#
# Circuit:
#   - LDR on A0 (with 10K voltage divider)
#   - LED (street light) on pin 9 (PWM)
#   - Ultrasonic Trig on pin 6
#   - Ultrasonic Echo on pin 7
#
# Concepts learned:
#   - Analog input
#   - PWM output
#   - Conditional logic
#   - Sensor fusion (combining two sensors)
# ============================================

LDR_PIN = 0         # Analog pin
LIGHT_PIN = 9       # PWM LED
TRIG = 6
ECHO = 7

DARK_THRESHOLD = 300    # Below this = dark
MOTION_DISTANCE = 50    # cm - detect motion within this range

print("🏮 Smart Street Light System")
print("=" * 35)

for cycle in range(20):
    # Read ambient light
    light_level = analog_read(LDR_PIN)
    is_dark = light_level < DARK_THRESHOLD

    # Read distance (motion detection)
    distance = analog_read(TRIG)  # Ultrasonic
    motion_detected = distance < MOTION_DISTANCE

    if is_dark:
        if motion_detected:
            # Dark + motion = full brightness
            analog_write(LIGHT_PIN, 255)
            print(f"  🌙 Dark + Motion detected ({distance}cm) -> FULL brightness")
        else:
            # Dark + no motion = dim light (energy saving)
            analog_write(LIGHT_PIN, 60)
            print(f"  🌙 Dark, no motion -> DIM mode (saving energy)")
    else:
        # Daytime = light OFF
        analog_write(LIGHT_PIN, 0)
        print(f"  ☀️ Daytime (light={light_level}) -> OFF")

    delay(1000)

analog_write(LIGHT_PIN, 0)
print("System stopped.")
