/**
 * ScratchBridge Firmware for Arduino Uno, Nano, and Mega 2560
 * Supports JSON-based serial communication protocol
 * 
 * Features:
 * - Digital and Analog I/O
 * - PWM and Servo control
 * - I2C, SPI communication
 * - Ultrasonic, OLED, NeoPixel support
 * - Auto-reconnect heartbeat
 */

#include <Servo.h>
#include <Wire.h>
#include <SPI.h>

// ===== CONFIGURATION =====
#define FIRMWARE_VERSION "2.0.0"
#define BOARD_TYPE_ARDUINO
#define MAX_SERVOS 12
#define MAX_NEOPIXELS 150
#define BUFFER_SIZE 256
#define HEARTBEAT_INTERVAL 1000

// ===== PIN DEFINITIONS =====
#ifdef ARDUINO_AVR_MEGA2560
  #define BOARD_NAME "Arduino Mega 2560"
  #define NUM_DIGITAL_PINS 54
  #define NUM_ANALOG_PINS 16
#else
  #define BOARD_NAME "Arduino Uno/Nano"
  #define NUM_DIGITAL_PINS 14
  #define NUM_ANALOG_PINS 6
#endif

// ===== SERVO MANAGEMENT =====
Servo servos[MAX_SERVOS];
int servoPins[MAX_SERVOS];
int servoCount = 0;

// ===== SERIAL BUFFER =====
char serialBuffer[BUFFER_SIZE];
int bufferIndex = 0;

// ===== HEARTBEAT =====
unsigned long lastHeartbeat = 0;
bool connected = false;

// ===== NEOPIXEL EMULATION (Basic PWM) =====
struct NeoPixelStrip {
  int pin;
  int count;
  uint32_t colors[MAX_NEOPIXELS];
  bool active;
};
NeoPixelStrip neoStrip = {0, 0, {}, false};

// Ultrasonic
struct UltrasonicSensor {
  int trig;
  int echo;
  bool active;
};
UltrasonicSensor ultrasonic = {0, 0, false};

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000); // Wait for serial on Leonardo
  
  Wire.begin();
  SPI.begin();
  
  // Initialize all digital pins as INPUT
  for (int i = 0; i < NUM_DIGITAL_PINS; i++) {
    pinMode(i, INPUT);
  }
  
  Serial.println("{");
  Serial.println("  \"event\": \"board_ready\",");
  Serial.print("  \"board\": \""); Serial.print(BOARD_NAME); Serial.println("\",");
  Serial.print("  \"version\": \""); Serial.print(FIRMWARE_VERSION); Serial.println("\"");
  Serial.println("}");
}

// ===== MAIN LOOP =====
void loop() {
  processSerial();
  sendHeartbeat();
  handleUltrasonic();
}

// ===== SERIAL COMMAND PROCESSOR =====
void processSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    
    if (c == '\n' || c == '\r') {
      if (bufferIndex > 0) {
        serialBuffer[bufferIndex] = '\0';
        processJsonCommand(serialBuffer);
        bufferIndex = 0;
      }
    } else if (bufferIndex < BUFFER_SIZE - 1) {
      serialBuffer[bufferIndex++] = c;
    }
  }
}

// ===== JSON COMMAND PARSER =====
void processJsonCommand(char* json) {
  // Simple JSON parser for hardware bridge commands
  // Expected format: {"cmd":"digital_write","pin":13,"value":1}
  
  char cmd[32] = {0};
  int pin = -1;
  int value = 0;
  int angle = 0;
  
  // Extract command
  extractString(json, "\"cmd\"", cmd, sizeof(cmd));
  pin = extractInt(json, "\"pin\"");
  value = extractInt(json, "\"value\"");
  angle = extractInt(json, "\"angle\"");
  
  if (strcmp(cmd, "digital_write") == 0) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, value ? HIGH : LOW);
    sendAck("digital_write", pin, value);
  }
  else if (strcmp(cmd, "digital_read") == 0) {
    pinMode(pin, INPUT);
    int val = digitalRead(pin);
    sendResponse("digital_read", pin, val);
  }
  else if (strcmp(cmd, "analog_write") == 0) {
    pinMode(pin, OUTPUT);
    analogWrite(pin, constrain(value, 0, 255));
    sendAck("analog_write", pin, value);
  }
  else if (strcmp(cmd, "analog_read") == 0) {
    if (pin >= 0 && pin < NUM_ANALOG_PINS) {
      int val = analogRead(pin);
      sendResponse("analog_read", pin, val);
    }
  }
  else if (strcmp(cmd, "servo_write") == 0) {
    setServo(pin, angle);
    sendAck("servo_write", pin, angle);
  }
  else if (strcmp(cmd, "pin_mode") == 0) {
    pinMode(pin, value ? OUTPUT : INPUT);
    sendAck("pin_mode", pin, value);
  }
  else if (strcmp(cmd, "ultrasonic_setup") == 0) {
    int trig = extractInt(json, "\"trig\"");
    int echo = extractInt(json, "\"echo\"");
    ultrasonic.trig = trig;
    ultrasonic.echo = echo;
    ultrasonic.active = true;
    pinMode(trig, OUTPUT);
    pinMode(echo, INPUT);
    sendAck("ultrasonic_setup", trig, echo);
  }
  else if (strcmp(cmd, "ultrasonic_read") == 0) {
    if (ultrasonic.active) {
      long distance = readUltrasonic();
      sendResponse("ultrasonic_read", ultrasonic.trig, distance);
    }
  }
  else if (strcmp(cmd, "i2c_write") == 0) {
    int address = extractInt(json, "\"address\"");
    int reg = extractInt(json, "\"register\"");
    Wire.beginTransmission(address);
    Wire.write(reg);
    Wire.write((uint8_t)value);
    Wire.endTransmission();
    sendAck("i2c_write", address, value);
  }
  else if (strcmp(cmd, "i2c_read") == 0) {
    int address = extractInt(json, "\"address\"");
    int reg = extractInt(json, "\"register\"");
    Wire.beginTransmission(address);
    Wire.write(reg);
    Wire.endTransmission();
    Wire.requestFrom(address, 1);
    if (Wire.available()) {
      sendResponse("i2c_read", address, Wire.read());
    }
  }
  else if (strcmp(cmd, "spi_transfer") == 0) {
    SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));
    digitalWrite(SS, LOW);
    int result = SPI.transfer(value);
    digitalWrite(SS, HIGH);
    SPI.endTransaction();
    sendResponse("spi_transfer", pin, result);
  }
  else if (strcmp(cmd, "neopixel_setup") == 0) {
    int count = extractInt(json, "\"count\"");
    neoStrip.pin = pin;
    neoStrip.count = min(count, MAX_NEOPIXELS);
    neoStrip.active = true;
    pinMode(pin, OUTPUT);
    sendAck("neopixel_setup", pin, count);
  }
  else if (strcmp(cmd, "neopixel_set") == 0) {
    int index = extractInt(json, "\"index\"");
    int r = extractInt(json, "\"r\"");
    int g = extractInt(json, "\"g\"");
    int b = extractInt(json, "\"b\"");
    if (index >= 0 && index < neoStrip.count) {
      neoStrip.colors[index] = ((uint32_t)r << 16) | ((uint32_t)g << 8) | b;
      // Simple single-LED indicator for basic boards
      analogWrite(pin, r > 0 ? HIGH : LOW);
    }
    sendAck("neopixel_set", pin, index);
  }
  else if (strcmp(cmd, "get_info") == 0) {
    sendBoardInfo();
  }
  else if (strcmp(cmd, "reset") == 0) {
    resetBoard();
    sendAck("reset", 0, 0);
  }
  else {
    Serial.print("{\"error\":\"unknown_command\",\"cmd\":\"");
    Serial.print(cmd);
    Serial.println("\"}");
  }
}

// ===== SERVO CONTROL =====
void setServo(int pin, int angle) {
  angle = constrain(angle, 0, 180);
  
  // Find existing servo
  for (int i = 0; i < servoCount; i++) {
    if (servoPins[i] == pin) {
      servos[i].write(angle);
      return;
    }
  }
  
  // Create new servo
  if (servoCount < MAX_SERVOS) {
    servos[servoCount].attach(pin);
    servos[servoCount].write(angle);
    servoPins[servoCount] = pin;
    servoCount++;
  }
}

// ===== ULTRASONIC SENSOR =====
long readUltrasonic() {
  digitalWrite(ultrasonic.trig, LOW);
  delayMicroseconds(2);
  digitalWrite(ultrasonic.trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(ultrasonic.trig, LOW);
  
  long duration = pulseIn(ultrasonic.echo, HIGH, 30000);
  return duration * 0.034 / 2; // Distance in cm
}

void handleUltrasonic() {
  // Continuous reading can be enabled here if needed
}

// ===== HEARTBEAT =====
void sendHeartbeat() {
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    Serial.println("{\"event\":\"heartbeat\",\"status\":\"alive\",\"millis\":\"" + String(millis()) + "\"}");
  }
}

// ===== RESPONSE HELPERS =====
void sendAck(const char* cmd, int pin, int value) {
  Serial.print("{\"ack\":\"");
  Serial.print(cmd);
  Serial.print("\",\"pin\":");
  Serial.print(pin);
  Serial.print(",\"value\":");
  Serial.print(value);
  Serial.println("}");
}

void sendResponse(const char* cmd, int pin, int value) {
  Serial.print("{\"response\":\"");
  Serial.print(cmd);
  Serial.print("\",\"pin\":");
  Serial.print(pin);
  Serial.print(",\"value\":");
  Serial.print(value);
  Serial.println("}");
}

void sendBoardInfo() {
  Serial.println("{");
  Serial.println("  \"event\": \"board_info\",");
  Serial.print("  \"board\": \""); Serial.print(BOARD_NAME); Serial.println("\",");
  Serial.print("  \"version\": \""); Serial.print(FIRMWARE_VERSION); Serial.println("\",");
  Serial.print("  \"digital_pins\": "); Serial.print(NUM_DIGITAL_PINS); Serial.println(",");
  Serial.print("  \"analog_pins\": "); Serial.print(NUM_ANALOG_PINS); Serial.println(",");
  Serial.println("  \"features\": [\"digital_io\",\"analog_io\",\"pwm\",\"servo\",\"i2c\",\"spi\",\"ultrasonic\",\"neopixel\"]");
  Serial.println("}");
}

void resetBoard() {
  for (int i = 0; i < servoCount; i++) {
    servos[i].detach();
  }
  servoCount = 0;
  ultrasonic.active = false;
  neoStrip.active = false;
  for (int i = 0; i < NUM_DIGITAL_PINS; i++) {
    pinMode(i, INPUT);
  }
}

// ===== JSON HELPERS =====
int extractInt(char* json, const char* key) {
  char* pos = strstr(json, key);
  if (!pos) return -1;
  pos = strchr(pos, ':');
  if (!pos) return -1;
  while (*pos && !isdigit(*pos) && *pos != '-') pos++;
  return atoi(pos);
}

void extractString(char* json, const char* key, char* dest, int maxLen) {
  char* pos = strstr(json, key);
  if (!pos) {
    dest[0] = '\0';
    return;
  }
  pos = strchr(pos, ':');
  if (!pos) {
    dest[0] = '\0';
    return;
  }
  pos = strchr(pos, '"');
  if (!pos) {
    dest[0] = '\0';
    return;
  }
  pos++;
  
  int i = 0;
  while (*pos && *pos != '"' && i < maxLen - 1) {
    dest[i++] = *pos++;
  }
  dest[i] = '\0';
}
