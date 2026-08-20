# ============================================
# Example: Obstacle Avoiding Robot
# Board: Arduino Uno / Nano / Mega / ESP32
# Level: Advanced
# ============================================
# Description:
#   A robot that moves forward and avoids obstacles.
#   Uses ultrasonic sensor to detect objects ahead.
#   When obstacle detected, stops, looks left/right,
#   and turns toward the clearer path.
#
# Circuit:
#   - Ultrasonic Trig on pin 9
#   - Ultrasonic Echo on pin 10
#   - Left motor forward on pin 5 (PWM)
#   - Left motor backward on pin 4
#   - Right motor forward on pin 6 (PWM)
#   - Right motor backward on pin 7
#   - Servo (for sensor rotation) on pin 3
#
# Concepts learned:
#   - Motor control with PWM
#   - Ultrasonic distance measurement
#   - Decision making algorithms
#   - Servo motor positioning
# ============================================

# Motor pins
LEFT_FWD = 5
LEFT_BWD = 4
RIGHT_FWD = 6
RIGHT_BWD = 7

# Sensor
TRIG = 9
ECHO = 10
SERVO = 3

# Settings
SPEED = 180         # Motor speed (0-255)
SAFE_DISTANCE = 25  # cm
TURN_TIME = 500     # ms

def move_forward():
    analog_write(LEFT_FWD, SPEED)
    digital_write(LEFT_BWD, 0)
    analog_write(RIGHT_FWD, SPEED)
    digital_write(RIGHT_BWD, 0)

def move_backward():
    digital_write(LEFT_FWD, 0)
    analog_write(LEFT_BWD, SPEED)
    digital_write(RIGHT_FWD, 0)
    analog_write(RIGHT_BWD, SPEED)

def turn_left():
    digital_write(LEFT_FWD, 0)
    analog_write(LEFT_BWD, SPEED)
    analog_write(RIGHT_FWD, SPEED)
    digital_write(RIGHT_BWD, 0)

def turn_right():
    analog_write(LEFT_FWD, SPEED)
    digital_write(LEFT_BWD, 0)
    digital_write(RIGHT_FWD, 0)
    analog_write(RIGHT_BWD, SPEED)

def stop_motors():
    analog_write(LEFT_FWD, 0)
    digital_write(LEFT_BWD, 0)
    analog_write(RIGHT_FWD, 0)
    digital_write(RIGHT_BWD, 0)

def get_distance():
    return analog_read(TRIG)

def look_left():
    servo_write(SERVO, 150)
    delay(400)
    d = get_distance()
    servo_write(SERVO, 90)
    delay(200)
    return d

def look_right():
    servo_write(SERVO, 30)
    delay(400)
    d = get_distance()
    servo_write(SERVO, 90)
    delay(200)
    return d

# Main robot loop
print("🤖 Obstacle Avoiding Robot")
print("=" * 30)
servo_write(SERVO, 90)  # Center the sensor
delay(500)

for step in range(30):
    distance = get_distance()
    print(f"Step {step+1}: Distance = {distance}cm")

    if distance > SAFE_DISTANCE:
        # Path is clear - move forward
        move_forward()
        print("  ➡️ Moving forward")
        delay(200)
    else:
        # Obstacle detected!
        print("  ⚠️ Obstacle detected!")
        stop_motors()
        delay(200)

        # Back up a little
        move_backward()
        delay(300)
        stop_motors()

        # Look left and right
        left_dist = look_left()
        right_dist = look_right()
        print(f"  👈 Left: {left_dist}cm | Right: {right_dist}cm 👉")

        # Turn toward clearer path
        if left_dist > right_dist:
            print("  ↩️ Turning LEFT")
            turn_left()
            delay(TURN_TIME)
        else:
            print("  ↪️ Turning RIGHT")
            turn_right()
            delay(TURN_TIME)

        stop_motors()
        delay(100)

stop_motors()
print("Robot stopped!")
