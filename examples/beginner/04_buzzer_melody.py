# ============================================
# Example 04: Buzzer Melody
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Beginner
# ============================================
# Description:
#   Play a simple melody using a buzzer with PWM.
#   Uses analog_write to generate tones.
#
# Circuit:
#   - Buzzer positive (+) on pin 8
#   - Buzzer negative (-) to GND
#
# Blocks equivalent:
#   [set pin 8 mode OUTPUT]
#   [PWM pin 8 value 128]
#   [wait 0.3 seconds]
#   [PWM pin 8 value 0]
#   [wait 0.1 seconds]
#   ...
# ============================================

BUZZER = 8

# Simple beep pattern
def beep(duration=200):
    analog_write(BUZZER, 128)   # Buzzer ON (50% duty)
    delay(duration)
    analog_write(BUZZER, 0)     # Buzzer OFF
    delay(100)

# Play pattern: short-short-long
print("Playing melody...")

# Three short beeps
for i in range(3):
    beep(150)
    print(f"  ♪ Short beep {i+1}")

delay(300)

# Two long beeps
for i in range(2):
    beep(500)
    print(f"  ♫ Long beep {i+1}")

delay(300)

# SOS pattern: ... --- ...
print("  SOS Pattern:")
# S: three short
for i in range(3):
    beep(100)
delay(200)
# O: three long
for i in range(3):
    beep(400)
delay(200)
# S: three short
for i in range(3):
    beep(100)

print("Melody complete!")
