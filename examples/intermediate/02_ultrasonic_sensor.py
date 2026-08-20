# ============================================
# Example: Ultrasonic Distance Sensor (HC-SR04)
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Intermediate
# ============================================
# Description:
#   Measure distance using HC-SR04 ultrasonic sensor.
#   Display distance and trigger LED warnings.
#
# Circuit:
#   - HC-SR04 Trig pin -> Arduino pin 9
#   - HC-SR04 Echo pin -> Arduino pin 10
#   - HC-SR04 VCC -> 5V
#   - HC-SR04 GND -> GND
#   - Warning LED on pin 13
#
# Blocks equivalent:
#   [set variable distance to (ultrasonic trig 9 echo 10)]
#   [if <distance < 20> then]
#     [digital write pin 13 HIGH]
#   [else]
#     [digital write pin 13 LOW]
# ============================================

TRIG = 9
ECHO = 10
LED = 13
WARNING_DISTANCE = 20  # cm

# Read distance 10 times
for i in range(10):
    distance = analog_read(TRIG)  # Ultrasonic read
    print(f"Distance: {distance} cm")

    if distance < WARNING_DISTANCE:
        digital_write(LED, 1)   # Too close! LED ON
        print("  ⚠️ Object too close!")
    else:
        digital_write(LED, 0)   # Safe distance
        print("  ✓ Safe distance")

    delay(500)

digital_write(LED, 0)
print("Measurement complete!")
