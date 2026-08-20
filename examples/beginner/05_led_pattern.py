# ============================================
# Example 05: LED Pattern (Knight Rider)
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Beginner
# ============================================
# Description:
#   Create a running light pattern using 6 LEDs.
#   LEDs light up one by one left to right, then back.
#
# Circuit:
#   - LED 1 on pin 2
#   - LED 2 on pin 3
#   - LED 3 on pin 4
#   - LED 4 on pin 5
#   - LED 5 on pin 6
#   - LED 6 on pin 7
#   - Each LED with 220 ohm resistor to GND
#
# Blocks equivalent:
#   [forever]
#     [for i = 2 to 7]
#       [digital write pin i HIGH]
#       [wait 0.1 seconds]
#       [digital write pin i LOW]
# ============================================

LEDS = [2, 3, 4, 5, 6, 7]

def all_off():
    for pin in LEDS:
        digital_write(pin, 0)

# Knight Rider pattern - 3 cycles
for cycle in range(3):
    print(f"Cycle {cycle + 1}")

    # Left to right
    for pin in LEDS:
        all_off()
        digital_write(pin, 1)
        delay(100)

    # Right to left
    for pin in reversed(LEDS):
        all_off()
        digital_write(pin, 1)
        delay(100)

all_off()
print("Pattern complete!")
