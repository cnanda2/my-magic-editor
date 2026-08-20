# ============================================
# Example: Light Sensor (LDR)
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Intermediate
# ============================================
# Description:
#   Read light level using an LDR (Light Dependent
#   Resistor) and control LED brightness accordingly.
#   Dark = LED bright, Light = LED dim.
#
# Circuit:
#   - LDR + 10K resistor voltage divider on A0
#     (LDR between 5V and A0, 10K between A0 and GND)
#   - LED on pin 9 (PWM)
#
# Blocks equivalent:
#   [forever]
#     [set variable light to (analog read pin A0)]
#     [set variable brightness to (255 - (light / 4))]
#     [PWM pin 9 value brightness]
# ============================================

LDR_PIN = 0     # Analog pin A0
LED_PIN = 9     # PWM pin

print("Reading light sensor...")
print("Cover the LDR to see LED get brighter!")

for i in range(20):
    # Read light level (0-1023 on Arduino, 0-4095 on ESP32)
    light_value = analog_read(LDR_PIN)

    # Map light to LED brightness (inverse)
    # More light = dimmer LED, Less light = brighter LED
    brightness = 255 - min(255, int(light_value / 4))

    analog_write(LED_PIN, brightness)

    # Display level
    bar = "█" * int(brightness / 25)
    print(f"  Light: {light_value} | LED: {brightness} |{bar}|")

    delay(500)

analog_write(LED_PIN, 0)
print("Done!")
