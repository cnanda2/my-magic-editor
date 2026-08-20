# ============================================
# Example: Line Follower Robot
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Advanced
# ============================================
# Description:
#   A robot that follows a black line on a white
#   surface using IR sensors. Uses two sensors
#   to detect the line and adjust motor speed.
#
# Circuit:
#   - Left IR sensor on A0
#   - Right IR sensor on A1
#   - Left motor PWM on pin 5
#   - Left motor direction on pin 4
#   - Right motor PWM on pin 6
#   - Right motor direction on pin 7
#
# Concepts learned:
#   - IR sensor reading
#   - Proportional control
#   - Motor speed adjustment
#   - Real-time decision making
# ============================================

# Sensor pins
LEFT_SENSOR = 0     # A0
RIGHT_SENSOR = 1    # A1

# Motor pins
LEFT_MOTOR_PWM = 5
LEFT_MOTOR_DIR = 4
RIGHT_MOTOR_PWM = 6
RIGHT_MOTOR_DIR = 7

# Settings
BASE_SPEED = 150
MAX_SPEED = 220
LINE_THRESHOLD = 500    # Below = black line, Above = white

def set_motors(left_speed, right_speed):
    # Left motor
    if left_speed >= 0:
        digital_write(LEFT_MOTOR_DIR, 1)
        analog_write(LEFT_MOTOR_PWM, min(left_speed, 255))
    else:
        digital_write(LEFT_MOTOR_DIR, 0)
        analog_write(LEFT_MOTOR_PWM, min(-left_speed, 255))

    # Right motor
    if right_speed >= 0:
        digital_write(RIGHT_MOTOR_DIR, 1)
        analog_write(RIGHT_MOTOR_PWM, min(right_speed, 255))
    else:
        digital_write(RIGHT_MOTOR_DIR, 0)
        analog_write(RIGHT_MOTOR_PWM, min(-right_speed, 255))

def stop():
    analog_write(LEFT_MOTOR_PWM, 0)
    analog_write(RIGHT_MOTOR_PWM, 0)

print("🏎️ Line Follower Robot")
print("=" * 30)
print("Place robot on the line and press Run!")
delay(2000)

for step in range(50):
    # Read sensors
    left_val = analog_read(LEFT_SENSOR)
    right_val = analog_read(RIGHT_SENSOR)

    left_on_line = left_val < LINE_THRESHOLD
    right_on_line = right_val < LINE_THRESHOLD

    if left_on_line and right_on_line:
        # Both sensors on line - go straight
        set_motors(BASE_SPEED, BASE_SPEED)
        direction = "⬆️ STRAIGHT"
    elif left_on_line and not right_on_line:
        # Line is to the left - turn left
        set_motors(BASE_SPEED // 3, MAX_SPEED)
        direction = "⬅️ LEFT"
    elif not left_on_line and right_on_line:
        # Line is to the right - turn right
        set_motors(MAX_SPEED, BASE_SPEED // 3)
        direction = "➡️ RIGHT"
    else:
        # Lost the line - stop or search
        set_motors(0, 0)
        direction = "❌ LOST LINE"

    print(f"  L:{left_val:4d} R:{right_val:4d} | {direction}")
    delay(50)

stop()
print("\nRobot stopped!")
