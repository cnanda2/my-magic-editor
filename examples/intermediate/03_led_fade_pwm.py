# ============================================
# Example: LED Fade with PWM
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Intermediate
# ============================================
# Description:
#   Smoothly fade an LED in and out using PWM.
#   PWM (Pulse Width Modulation) allows controlling
#   brightness from 0 (off) to 255 (full brightness).
#
# Circuit:
#   - LED on pin 9 (must be a PWM pin: 3,5,6,9,10,11)
#   - 220 ohm resistor in series to GND
#
# Blocks equivalent:
#   [forever]
#     [for brightness = 0 to 255 step 5]
#       [PWM pin 9 value brightness]
#       [wait 0.02 seconds]
#     [for brightness = 255 to 0 step -5]
#       [PWM pin 9 value brightness]
#       [wait 0.02 seconds]
# ============================================

LED_PIN = 9  # Must be PWM capable pin

# Fade in and out - 3 cycles
for cycle in range(3):
    print(f"Fade cycle {cycle + 1}/3")

    # Fade IN (0 -> 255)
    print("  Fading in...")
    for brightness in range(0, 256, 5):
        analog_write(LED_PIN, brightness)
        delay(20)

    # Fade OUT (255 -> 0)
    print("  Fading out...")
    for brightness in range(255, -1, -5):
        analog_write(LED_PIN, brightness)
        delay(20)

    delay(500)

# Breathing effect - faster
print("Breathing effect...")
for cycle in range(5):
    for brightness in range(0, 256, 10):
        analog_write(LED_PIN, brightness)
        delay(10)
    for brightness in range(255, -1, -10):
        analog_write(LED_PIN, brightness)
        delay(10)

analog_write(LED_PIN, 0)
print("Done!")
