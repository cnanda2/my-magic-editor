# ============================================
# Example 01: LED Blink
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Beginner
# ============================================
# Description:
#   Blink the built-in LED on pin 13.
#   The LED turns ON for 1 second, then OFF for 1 second.
#
# Circuit:
#   No extra wiring needed! Pin 13 has a built-in LED.
#
# Blocks equivalent:
#   [set pin 13 mode OUTPUT]
#   [forever]
#     [digital write pin 13 HIGH]
#     [wait 1 second]
#     [digital write pin 13 LOW]
#     [wait 1 second]
# ============================================

# Setup
digital_write(13, 1)    # LED ON
delay(1000)             # Wait 1 second
digital_write(13, 0)    # LED OFF
delay(1000)             # Wait 1 second

# Repeat 10 times
for i in range(10):
    digital_write(13, 1)
    delay(1000)
    digital_write(13, 0)
    delay(1000)
    print(f"Blink {i+1}/10")

print("Done!")
