# ============================================
# Example 03: Traffic Light
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Beginner
# ============================================
# Description:
#   Simulate a traffic light using 3 LEDs.
#   Red -> Yellow -> Green -> Yellow -> Red
#
# Circuit:
#   - Red LED on pin 10
#   - Yellow LED on pin 11
#   - Green LED on pin 12
#   - Each LED with 220 ohm resistor to GND
#
# Blocks equivalent:
#   [set pin 10 mode OUTPUT]
#   [set pin 11 mode OUTPUT]
#   [set pin 12 mode OUTPUT]
#   [forever]
#     [digital write pin 10 HIGH] (Red ON)
#     [wait 5 seconds]
#     [digital write pin 10 LOW]
#     [digital write pin 11 HIGH] (Yellow ON)
#     [wait 2 seconds]
#     [digital write pin 11 LOW]
#     [digital write pin 12 HIGH] (Green ON)
#     [wait 5 seconds]
#     ...
# ============================================

RED = 10
YELLOW = 11
GREEN = 12

def all_off():
    digital_write(RED, 0)
    digital_write(YELLOW, 0)
    digital_write(GREEN, 0)

# Traffic light sequence
for cycle in range(3):
    print(f"Cycle {cycle + 1}")

    # Red light - STOP
    all_off()
    digital_write(RED, 1)
    print("  🔴 RED - STOP")
    delay(5000)

    # Yellow light - GET READY
    all_off()
    digital_write(YELLOW, 1)
    print("  🟡 YELLOW - GET READY")
    delay(2000)

    # Green light - GO
    all_off()
    digital_write(GREEN, 1)
    print("  🟢 GREEN - GO")
    delay(5000)

    # Yellow light - SLOW DOWN
    all_off()
    digital_write(YELLOW, 1)
    print("  🟡 YELLOW - SLOW DOWN")
    delay(2000)

all_off()
print("Traffic light complete!")
