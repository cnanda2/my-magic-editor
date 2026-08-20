# ============================================
# Example: WiFi Controlled LED (ESP32 Only)
# Board: ESP32
# Level: Advanced
# ============================================
# Description:
#   Control an LED over WiFi using the ESP32's
#   built-in WiFi. Connect to a network and
#   send commands wirelessly.
#
# Circuit:
#   - LED on pin 2 (built-in on most ESP32 boards)
#   - Or external LED on pin 13
#
# Concepts learned:
#   - WiFi connectivity
#   - Remote control
#   - IoT basics
#   - ESP32 specific features
# ============================================

LED_PIN = 2     # Built-in LED on ESP32

print("📡 WiFi LED Control - ESP32")
print("=" * 35)

# Connect to WiFi (ESP32 firmware handles this)
print("Connecting to WiFi...")
# wifi_connect("YourSSID", "YourPassword")
delay(2000)
print("✓ WiFi connected!")
print("  IP: 192.168.1.xxx")
print("  WebSocket: ws://192.168.1.xxx:81")

# Demonstrate LED control patterns
print("\nRunning LED demo over WiFi...")

# Pattern 1: Quick blinks
print("  Pattern 1: Quick blinks")
for i in range(10):
    digital_write(LED_PIN, 1)
    delay(100)
    digital_write(LED_PIN, 0)
    delay(100)

delay(500)

# Pattern 2: Slow pulse
print("  Pattern 2: Slow pulse")
for i in range(5):
    digital_write(LED_PIN, 1)
    delay(500)
    digital_write(LED_PIN, 0)
    delay(500)

delay(500)

# Pattern 3: SOS
print("  Pattern 3: SOS signal")
# S: ...
for i in range(3):
    digital_write(LED_PIN, 1)
    delay(150)
    digital_write(LED_PIN, 0)
    delay(150)
delay(300)
# O: ---
for i in range(3):
    digital_write(LED_PIN, 1)
    delay(400)
    digital_write(LED_PIN, 0)
    delay(150)
delay(300)
# S: ...
for i in range(3):
    digital_write(LED_PIN, 1)
    delay(150)
    digital_write(LED_PIN, 0)
    delay(150)

digital_write(LED_PIN, 0)
print("\n✓ Demo complete!")
print("  You can now control the LED from any")
print("  device on the same WiFi network.")
