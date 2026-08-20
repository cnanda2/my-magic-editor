# ============================================
# Example: Servo Motor Control
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Intermediate
# ============================================
# Description:
#   Control a servo motor to sweep from 0 to 180
#   degrees and back. Then move to specific angles.
#
# Circuit:
#   - Servo signal wire (orange/yellow) on pin 9
#   - Servo power (red) to 5V
#   - Servo ground (brown/black) to GND
#
# Blocks equivalent:
#   [set servo pin 9 angle 0]
#   [wait 1 second]
#   [set servo pin 9 angle 90]
#   [wait 1 second]
#   [set servo pin 9 angle 180]
# ============================================

SERVO_PIN = 9

# Move to specific positions
print("Moving to 0 degrees...")
servo_write(SERVO_PIN, 0)
delay(1000)

print("Moving to 45 degrees...")
servo_write(SERVO_PIN, 45)
delay(1000)

print("Moving to 90 degrees (center)...")
servo_write(SERVO_PIN, 90)
delay(1000)

print("Moving to 135 degrees...")
servo_write(SERVO_PIN, 135)
delay(1000)

print("Moving to 180 degrees...")
servo_write(SERVO_PIN, 180)
delay(1000)

# Smooth sweep
print("Sweeping 0 to 180...")
for angle in range(0, 181, 5):
    servo_write(SERVO_PIN, angle)
    delay(30)

print("Sweeping 180 to 0...")
for angle in range(180, -1, -5):
    servo_write(SERVO_PIN, angle)
    delay(30)

# Return to center
servo_write(SERVO_PIN, 90)
print("Done! Servo at center position.")
