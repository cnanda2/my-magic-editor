#if defined(ARDUINO_AVR_UNO) || defined(ARDUINO_AVR_NANO) || defined(ARDUINO_AVR_MEGA2560)
#include <Servo.h>
#define SERVO_SUPPORTED
#endif

#ifdef SERVO_SUPPORTED
Servo servos[12];
int servoPins[12];
int servoCount = 0;
#endif

int getIntValue(const char* json, const char* key) {
  char search[32];
  strcpy(search, "\"");
  strcat(search, key);
  strcat(search, "\":");
  char* p = strstr(json, search);
  if (!p) return -1;
  p += strlen(search);
  while (*p == ' ') p++;
  if (*p == '"') {
    p++;
    char* end = strchr(p, '"');
    if (!end) return -1;
    char buf[16];
    int len = end - p;
    if (len > 15) len = 15;
    strncpy(buf, p, len);
    buf[len] = 0;
    return atoi(buf);
  }
  if (*p == '-' || (*p >= '0' && *p <= '9')) {
    return atoi(p);
  }
  if (strncmp(p, "true", 4) == 0) return 1;
  if (strncmp(p, "false", 5) == 0) return 0;
  return -1;
}

void extractString(const char* json, const char* key, char* out, int maxLen) {
  out[0] = 0;
  char search[32];
  strcpy(search, "\"");
  strcat(search, key);
  strcat(search, "\":\"");
  char* p = strstr(json, search);
  if (!p) return;
  p += strlen(search);
  char* end = strchr(p, '"');
  if (!end) return;
  int len = end - p;
  if (len > maxLen - 1) len = maxLen - 1;
  strncpy(out, p, len);
  out[len] = 0;
}

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

void setup() {
  Serial.begin(115200);
  while (!Serial) { delay(10); }
  pinMode(13, OUTPUT);
}

void loop() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() == 0) return;

    const char* json = input.c_str();
    char cmd[32];
    extractString(json, "cmd", cmd, sizeof(cmd));

    if (strlen(cmd) == 0) {
      Serial.println("{\"error\":\"no cmd\"}");
      return;
    }

    if (strcmp(cmd, "get_info") == 0) {
      sendResponse("get_info", 0, 1);
    }
    else if (strcmp(cmd, "pin_mode") == 0) {
      int pin = getIntValue(json, "pin");
      int val = getIntValue(json, "value");
      if (pin >= 0) {
        if (val == 2) pinMode(pin, INPUT_PULLUP);
        else if (val == 0) pinMode(pin, INPUT);
        else pinMode(pin, OUTPUT);
        sendAck("pin_mode", pin, val);
      }
    }
    else if (strcmp(cmd, "digital_write") == 0) {
      int pin = getIntValue(json, "pin");
      int val = getIntValue(json, "value");
      if (pin >= 0) {
        digitalWrite(pin, val ? HIGH : LOW);
        sendAck("digital_write", pin, val ? 1 : 0);
      }
    }
    else if (strcmp(cmd, "digital_read") == 0) {
      int pin = getIntValue(json, "pin");
      if (pin >= 0) {
        sendResponse("digital_read", pin, digitalRead(pin));
      }
    }
    else if (strcmp(cmd, "analog_write") == 0) {
      int pin = getIntValue(json, "pin");
      int val = getIntValue(json, "value");
      if (pin >= 0) {
        analogWrite(pin, val);
        sendAck("analog_write", pin, val);
      }
    }
    else if (strcmp(cmd, "analog_read") == 0) {
      int pin = getIntValue(json, "pin");
      if (pin >= 0) {
        sendResponse("analog_read", pin, analogRead(pin));
      }
    }
    else if (strcmp(cmd, "servo_write") == 0) {
#ifdef SERVO_SUPPORTED
      int pin = getIntValue(json, "pin");
      int angle = getIntValue(json, "angle");
      if (pin >= 0) {
        int idx = -1;
        for (int i = 0; i < servoCount; i++) {
          if (servoPins[i] == pin) { idx = i; break; }
        }
        if (idx == -1 && servoCount < 12) {
          idx = servoCount;
          servoPins[idx] = pin;
          servos[idx].attach(pin);
          servoCount++;
        }
        if (idx >= 0 && angle >= 0) servos[idx].write(angle);
        sendAck("servo_write", pin, angle);
      }
#else
      Serial.println("{\"error\":\"servo not supported\"}");
#endif
    }
    else if (strcmp(cmd, "ultrasonic_setup") == 0) {
      int trig = getIntValue(json, "trig");
      int echo = getIntValue(json, "echo");
      if (trig >= 0) pinMode(trig, OUTPUT);
      if (echo >= 0) pinMode(echo, INPUT);
      sendAck("ultrasonic_setup", trig, echo);
    }
    else if (strcmp(cmd, "ultrasonic_read") == 0) {
      int trig = getIntValue(json, "pin");
      int echo = getIntValue(json, "echo");
      if (echo < 0) echo = trig;
      if (trig >= 0 && echo >= 0) {
        digitalWrite(trig, LOW);
        delayMicroseconds(2);
        digitalWrite(trig, HIGH);
        delayMicroseconds(10);
        digitalWrite(trig, LOW);
        long duration = pulseIn(echo, HIGH, 30000);
        int distance = duration * 0.034 / 2;
        sendResponse("ultrasonic_read", trig, distance);
      }
    }
    else if (strcmp(cmd, "reset") == 0) {
#ifdef SERVO_SUPPORTED
      for (int i = 0; i < servoCount; i++) servos[i].detach();
      servoCount = 0;
#endif
      sendAck("reset", 0, 0);
    }
    else {
      Serial.print("{\"error\":\"unknown cmd\",\"cmd\":\"");
      Serial.print(cmd);
      Serial.println("\"}");
    }
  }
}
