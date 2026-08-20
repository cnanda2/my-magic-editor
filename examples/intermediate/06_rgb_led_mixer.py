# ============================================
# Example: RGB LED Color Mixer
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Intermediate
# ============================================
# Description:
#   Mix colors using an RGB LED with PWM.
#   Create different colors by combining
#   Red, Green, and Blue values (0-255).
#
# Circuit:
#   - RGB LED Red pin -> pin 9 (PWM) + 220Ω
#   - RGB LED Green pin -> pin 10 (PWM) + 220Ω
#   - RGB LED Blue pin -> pin 11 (PWM) + 220Ω
#   - RGB LED Common -> GND (common cathode)
#
# Concepts learned:
#   - PWM for color mixing
#   - RGB color model
#   - Loops and patterns
# ============================================

RED_PIN = 9
GREEN_PIN = 10
BLUE_PIN = 11

def set_color(r, g, b):
    analog_write(RED_PIN, r)
    analog_write(GREEN_PIN, g)
    analog_write(BLUE_PIN, b)

def off():
    set_color(0, 0, 0)

print("🌈 RGB LED Color Mixer")
print("=" * 30)

# Basic colors
colors = [
    (255, 0, 0, "Red"),
    (0, 255, 0, "Green"),
    (0, 0, 255, "Blue"),
    (255, 255, 0, "Yellow"),
    (0, 255, 255, "Cyan"),
    (255, 0, 255, "Magenta"),
    (255, 128, 0, "Orange"),
    (128, 0, 255, "Purple"),
    (255, 255, 255, "White"),
]

for r, g, b, name in colors:
    set_color(r, g, b)
    print(f"  🎨 {name} ({r}, {g}, {b})")
    delay(1000)

# Rainbow fade
print("\nRainbow fade...")
# Red to Yellow
for i in range(0, 256, 10):
    set_color(255, i, 0)
    delay(20)
# Yellow to Green
for i in range(255, -1, -10):
    set_color(i, 255, 0)
    delay(20)
# Green to Cyan
for i in range(0, 256, 10):
    set_color(0, 255, i)
    delay(20)
# Cyan to Blue
for i in range(255, -1, -10):
    set_color(0, i, 255)
    delay(20)
# Blue to Magenta
for i in range(0, 256, 10):
    set_color(i, 0, 255)
    delay(20)
# Magenta to Red
for i in range(255, -1, -10):
    set_color(255, 0, i)
    delay(20)

off()
print("Done! 🌈")
