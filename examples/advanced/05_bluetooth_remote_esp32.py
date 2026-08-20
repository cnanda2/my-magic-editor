# ============================================
# Example: Bluetooth Remote Control (ESP32 Only)
# Board: ESP32
# Level: Advanced
# ============================================
# Description:
#   Control multiple outputs via Bluetooth.
#   The ESP32 acts as a BLE peripheral that
#   receives commands from the browser.
#
# Circuit:
#   - LED 1 (Red) on pin 13
#   - LED 2 (Green) on pin 12
#   - LED 3 (Blue) on pin 14
#   - Servo on pin 27
#   - Buzzer on pin 26
#
# Concepts learned:
#   - Bluetooth Low Energy (BLE)
#   - Remote control protocol
#   - Multiple output control
#   - Command parsing
# ============================================

RED_LED = 13
GREEN_LED = 12
BLUE_LED = 14
SERVO_PIN = 27
BUZZER = 26

print("📱 Bluetooth Remote Control - ESP32")
print("=" * 40)
print("Device name: ScratchBridge-ESP32")
print("Waiting for Bluetooth connection...")
delay(1000)

# Simulate receiving BLE commands
print("\n✓ Connected via Bluetooth!")
print("Running command sequence...\n")

# Command: All LEDs ON
print("CMD: All LEDs ON")
digital_write(RED_LED, 1)
digital_write(GREEN_LED, 1)
digital_write(BLUE_LED, 1)
delay(1000)

# Command: Red only
print("CMD: Red LED only")
digital_write(RED_LED, 1)
digital_write(GREEN_LED, 0)
digital_write(BLUE_LED, 0)
delay(1000)

# Command: Green only
print("CMD: Green LED only")
digital_write(RED_LED, 0)
digital_write(GREEN_LED, 1)
digital_write(BLUE_LED, 0)
delay(1000)

# Command: Blue only
print("CMD: Blue LED only")
digital_write(RED_LED, 0)
digital_write(GREEN_LED, 0)
digital_write(BLUE_LED, 1)
delay(1000)

# Command: Servo sweep
print("CMD: Servo sweep")
for angle in range(0, 181, 30):
    servo_write(SERVO_PIN, angle)
    print(f"  Servo -> {angle}°")
    delay(300)
servo_write(SERVO_PIN, 90)

# Command: Buzzer alert
print("CMD: Buzzer alert")
for i in range(3):
    analog_write(BUZZER, 128)
    delay(200)
    analog_write(BUZZER, 0)
    delay(200)

# Command: Rainbow cycle
print("CMD: LED rainbow cycle")
leds = [RED_LED, GREEN_LED, BLUE_LED]
for cycle in range(3):
    for led in leds:
        digital_write(RED_LED, 0)
        digital_write(GREEN_LED, 0)
        digital_write(BLUE_LED, 0)
        digital_write(led, 1)
        delay(300)

# All OFF
digital_write(RED_LED, 0)
digital_write(GREEN_LED, 0)
digital_write(BLUE_LED, 0)
analog_write(BUZZER, 0)

print("\n✓ All commands executed!")
print("  Device ready for more commands via BLE.")
