# ============================================
# Example 02: LED ON/OFF with Button
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Beginner
# ============================================
# Description:
#   Read a push button on pin 2.
#   When button is pressed, turn LED ON.
#   When released, turn LED OFF.
#
# Circuit:
#   - LED on pin 13 (built-in)
#   - Push button on pin 2 with pull-up resistor
#     (or use INPUT_PULLUP mode)
#
# Blocks equivalent:
#   [set pin 13 mode OUTPUT]
#   [set pin 2 mode INPUT_PULLUP]
#   [forever]
#     [if <digital read pin 2 = 0> then]
#       [digital write pin 13 HIGH]
#     [else]
#       [digital write pin 13 LOW]
# ============================================

# Read button state
button_state = digital_read(2)

# If button pressed (LOW when using pull-up)
if button_state == 0:
    digital_write(13, 1)    # LED ON
    print("Button pressed - LED ON")
else:
    digital_write(13, 0)    # LED OFF
    print("Button released - LED OFF")
