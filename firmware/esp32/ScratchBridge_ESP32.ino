/**
 * ScratchBridge Firmware for ESP32 and ESP32-CAM
 * Supports WiFi, WebSocket, Bluetooth LE, and USB Serial
 * 
 * Features:
 * - Dual-core operation
 * - WiFi Station/AP mode
 * - WebSocket server for remote control
 * - BLE support
 * - OTA updates
 * - Camera support (ESP32-CAM)
 * - Rich peripheral support
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <Update.h>
#include <BluetoothSerial.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Conditional includes for camera
#if defined(CAMERA_MODEL_AI_THINKER)
  #include "esp_camera.h"
  #define HAS_CAMERA 1
#else
  #define HAS_CAMERA 0
#endif

// ===== CONFIGURATION =====
#define FIRMWARE_VERSION "2.0.0"
#define BOARD_NAME "ESP32"
#define DEVICE_NAME "ScratchBridge-ESP32"

// Default WiFi credentials (can be configured via serial)
char wifi_ssid[64] = "";
char wifi_pass[64] = "";
bool ap_mode = true;

// WebSocket server
WebSocketsServer webSocket = WebSocketsServer(81);
WebServer httpServer(80);

// Bluetooth Serial
BluetoothSerial SerialBT;
bool bt_enabled = false;

// BLE
BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;
bool ble_enabled = false;
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// Communication interfaces
enum CommType { COMM_SERIAL, COMM_WIFI, COMM_BT, COMM_BLE };

// Heartbeat
unsigned long lastHeartbeat = 0;
unsigned long lastClientPing = 0;

// Pin states
const int NUM_GPIO = 40;
int pinModes[NUM_GPIO];
int pinValues[NUM_GPIO];

// Task handles
TaskHandle_t webSocketTaskHandle = NULL;
TaskHandle_t serialTaskHandle = NULL;

// Camera configuration
#if HAS_CAMERA
camera_config_t camera_config;
bool camera_initialized = false;
#endif

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("  ScratchBridge ESP32 Firmware v" FIRMWARE_VERSION);
  Serial.println("========================================\n");
  
  // Initialize GPIO tracking
  for (int i = 0; i < NUM_GPIO; i++) {
    pinModes[i] = INPUT;
    pinValues[i] = 0;
  }
  
  // Setup WiFi
  setupWiFi();
  
  // Setup WebSocket
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  // Setup HTTP server
  setupHTTPServer();
  
  // Setup mDNS
  if (MDNS.begin("scratchbridge")) {
    Serial.println("mDNS responder started: scratchbridge.local");
  }
  
  // Setup Bluetooth
  SerialBT.begin(DEVICE_NAME);
  bt_enabled = true;
  Serial.println("Bluetooth Serial started");
  
  // Setup BLE
  setupBLE();
  
  // Initialize camera if present
  #if HAS_CAMERA
  initCamera();
  #endif
  
  // Create tasks on second core
  xTaskCreatePinnedToCore(
    webSocketLoopTask,
    "WebSocketTask",
    4096,
    NULL,
    1,
    &webSocketTaskHandle,
    0
  );
  
  Serial.println("Setup complete. Ready for commands.");
  broadcastEvent("board_ready", "{");
  sendJSON("serial", "{\"event\":\"ready\",\"board\":\"ESP32\",\"version\":\"" FIRMWARE_VERSION "\"}");
}

void loop() {
  processSerialCommands();
  processBluetoothCommands();
  handleHeartbeat();
  httpServer.handleClient();
  delay(1);
}

// ===== WIFI SETUP =====
void setupWiFi() {
  if (strlen(wifi_ssid) > 0 && !ap_mode) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifi_ssid, wifi_pass);
    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nWiFi connected");
      Serial.print("IP: ");
      Serial.println(WiFi.localIP());
    } else {
      Serial.println("\nWiFi failed, starting AP");
      startAP();
    }
  } else {
    startAP();
  }
}

void startAP() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP("ScratchBridge-Setup", "12345678");
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());
  ap_mode = true;
}

// ===== BLE SETUP =====
void setupBLE() {
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  ble_enabled = true;
  Serial.println("BLE started");
}

// ===== HTTP SERVER =====
void setupHTTPServer() {
  httpServer.on("/", HTTP_GET, []() {
    httpServer.send(200, "text/html", getStatusPage());
  });
  
  httpServer.on("/api/status", HTTP_GET, []() {
    String json = "{";
    json += "\"board\":\"ESP32\",";
    json += "\"version\":\"" + String(FIRMWARE_VERSION) + "\",";
    json += "\"wifi_connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
    json += "\"ip\":\"" + (WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString()) + "\",";
    json += "\"clients\":" + String(webSocket.connectedClients()) + ",";
    json += "\"uptime\":" + String(millis() / 1000);
    json += "}";
    httpServer.send(200, "application/json", json);
  });
  
  httpServer.on("/api/command", HTTP_POST, []() {
    if (httpServer.hasArg("plain")) {
      String cmd = httpServer.arg("plain");
      processCommand(cmd, COMM_WIFI);
      httpServer.send(200, "application/json", "{\"status\":\"ok\"}");
    } else {
      httpServer.send(400, "application/json", "{\"error\":\"no_command\"}");
    }
  });
  
  httpServer.on("/update", HTTP_POST, []() {
    httpServer.sendHeader("Connection", "close");
    httpServer.send(200, "text/plain", (Update.hasError()) ? "FAIL" : "OK");
    ESP.restart();
  }, []() {
    HTTPUpload& upload = httpServer.upload();
    if (upload.status == UPLOAD_FILE_START) {
      if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
      if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_END) {
      if (Update.end(true)) {
        Serial.printf("Update Success: %u\nRebooting...\n", upload.totalSize);
      } else {
        Update.printError(Serial);
      }
    }
  });
  
  httpServer.begin();
  Serial.println("HTTP server started on port 80");
}

// ===== WEBSOCKET EVENTS =====
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("WebSocket client #%u disconnected\n", num);
      break;
    case WStype_CONNECTED:
      Serial.printf("WebSocket client #%u connected\n", num);
      webSocket.sendTXT(num, "{\"event\":\"connected\",\"board\":\"ESP32\"}");
      break;
    case WStype_TEXT:
      payload[length] = '\0';
      processCommand((char*)payload, COMM_WIFI);
      break;
    case WStype_BIN:
      // Handle binary data if needed
      break;
  }
}

void webSocketLoopTask(void * parameter) {
  for (;;) {
    webSocket.loop();
    delay(1);
  }
}

// ===== COMMAND PROCESSOR =====
void processCommand(String& cmdStr, CommType source) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, cmdStr);
  
  if (error) {
    sendError("invalid_json", source);
    return;
  }
  
  const char* cmd = doc["cmd"] | "";
  int pin = doc["pin"] | -1;
  int value = doc["value"] | 0;
  
  if (strcmp(cmd, "digital_write") == 0) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, value ? HIGH : LOW);
    pinValues[pin] = value;
    sendAck(cmd, pin, value, source);
  }
  else if (strcmp(cmd, "digital_read") == 0) {
    pinMode(pin, INPUT);
    int val = digitalRead(pin);
    pinValues[pin] = val;
    sendResponse(cmd, pin, val, source);
  }
  else if (strcmp(cmd, "analog_write") == 0) {
    pinMode(pin, OUTPUT);
    ledcSetup(pin, 5000, 8);
    ledcAttachPin(pin, pin);
    ledcWrite(pin, constrain(value, 0, 255));
    pinValues[pin] = value;
    sendAck(cmd, pin, value, source);
  }
  else if (strcmp(cmd, "analog_read") == 0) {
    if (pin >= 0 && pin < NUM_GPIO) {
      int val = analogRead(pin);
      sendResponse(cmd, pin, val, source);
    }
  }
  else if (strcmp(cmd, "dac_write") == 0) {
    if (pin == 25 || pin == 26) {
      dacWrite(pin, constrain(value, 0, 255));
      sendAck(cmd, pin, value, source);
    }
  }
  else if (strcmp(cmd, "servo_write") == 0) {
    int angle = doc["angle"] | 0;
    ledcSetup(pin, 50, 16);
    ledcAttachPin(pin, pin);
    uint32_t duty = map(constrain(angle, 0, 180), 0, 180, 1638, 8192);
    ledcWrite(pin, duty);
    sendAck(cmd, pin, angle, source);
  }
  else if (strcmp(cmd, "touch_read") == 0) {
    int val = touchRead(pin);
    sendResponse(cmd, pin, val, source);
  }
  else if (strcmp(cmd, "hall_read") == 0) {
    int val = hallRead();
    sendResponse(cmd, 0, val, source);
  }
  else if (strcmp(cmd, "wifi_connect") == 0) {
    const char* ssid = doc["ssid"] | "";
    const char* pass = doc["pass"] | "";
    strcpy(wifi_ssid, ssid);
    strcpy(wifi_pass, pass);
    ap_mode = false;
    WiFi.disconnect();
    setupWiFi();
    sendResponse("wifi_connect", 0, WiFi.status() == WL_CONNECTED ? 1 : 0, source);
  }
  else if (strcmp(cmd, "wifi_status") == 0) {
    sendResponse("wifi_status", 0, WiFi.status() == WL_CONNECTED ? 1 : 0, source);
  }
  else if (strcmp(cmd, "wifi_scan") == 0) {
    String networks = "[";
    int n = WiFi.scanNetworks();
    for (int i = 0; i < n; ++i) {
      if (i > 0) networks += ",";
      networks += "\"" + WiFi.SSID(i) + "\"";
    }
    networks += "]";
    String resp = "{\"response\":\"wifi_scan\",\"networks\":" + networks + "}";
    sendRaw(resp, source);
  }
  else if (strcmp(cmd, "ultrasonic_read") == 0) {
    int trig = doc["trig"] | -1;
    int echo = doc["echo"] | -1;
    if (trig >= 0 && echo >= 0) {
      pinMode(trig, OUTPUT);
      pinMode(echo, INPUT);
      digitalWrite(trig, LOW);
      delayMicroseconds(2);
      digitalWrite(trig, HIGH);
      delayMicroseconds(10);
      digitalWrite(trig, LOW);
      long duration = pulseIn(echo, HIGH, 30000);
      long distance = duration * 0.034 / 2;
      sendResponse(cmd, trig, distance, source);
    }
  }
  else if (strcmp(cmd, "i2c_scan") == 0) {
    String devices = "[";
    Wire.begin();
    for (uint8_t addr = 1; addr < 127; addr++) {
      Wire.beginTransmission(addr);
      if (Wire.endTransmission() == 0) {
        if (devices.length() > 1) devices += ",";
        devices += String(addr);
      }
    }
    devices += "]";
    String resp = "{\"response\":\"i2c_scan\",\"devices\":" + devices + "}";
    sendRaw(resp, source);
  }
  else if (strcmp(cmd, "ota_update") == 0) {
    sendResponse("ota_update", 0, 1, source);
    // OTA is handled via HTTP /update endpoint
  }
  else if (strcmp(cmd, "restart") == 0) {
    sendResponse("restart", 0, 1, source);
    delay(500);
    ESP.restart();
  }
  else if (strcmp(cmd, "get_info") == 0) {
    sendBoardInfo(source);
  }
  else {
    sendError("unknown_command", source);
  }
}

void processSerialCommands() {
  static String buffer = "";
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      processCommand(buffer, COMM_SERIAL);
      buffer = "";
    } else {
      buffer += c;
    }
  }
}

void processBluetoothCommands() {
  static String buffer = "";
  while (SerialBT.available()) {
    char c = SerialBT.read();
    if (c == '\n') {
      processCommand(buffer, COMM_BT);
      buffer = "";
    } else {
      buffer += c;
    }
  }
}

// ===== RESPONSE SENDERS =====
void sendJSON(const char* channel, const char* json) {
  Serial.println(json);
  if (bt_enabled) SerialBT.println(json);
  webSocket.broadcastTXT(json);
}

void sendRaw(String& json, CommType source) {
  switch (source) {
    case COMM_SERIAL:
      Serial.println(json);
      break;
    case COMM_WIFI:
      webSocket.broadcastTXT(json);
      break;
    case COMM_BT:
      if (bt_enabled) SerialBT.println(json);
      break;
    case COMM_BLE:
      if (ble_enabled) {
        pCharacteristic->setValue(json.c_str());
        pCharacteristic->notify();
      }
      break;
  }
}

void sendAck(const char* cmd, int pin, int value, CommType source) {
  String json = "{\"ack\":\"" + String(cmd) + "\",\"pin\":" + pin + ",\"value\":" + value + "}";
  sendRaw(json, source);
}

void sendResponse(const char* cmd, int pin, int value, CommType source) {
  String json = "{\"response\":\"" + String(cmd) + "\",\"pin\":" + pin + ",\"value\":" + value + "}";
  sendRaw(json, source);
}

void sendError(const char* error, CommType source) {
  String json = "{\"error\":\"" + String(error) + "\"}";
  sendRaw(json, source);
}

void broadcastEvent(const char* event, const char* data) {
  String json = "{\"event\":\"" + String(event) + "\",\"data\":" + String(data) + "}";
  Serial.println(json);
  if (bt_enabled) SerialBT.println(json);
  webSocket.broadcastTXT(json);
}

void sendBoardInfo(CommType source) {
  String json = "{";
  json += "\"event\":\"board_info\",";
  json += "\"board\":\"ESP32\",";
  json += "\"version\":\"" + String(FIRMWARE_VERSION) + "\",";
  json += "\"features\":[\"digital_io\",\"analog_io\",\"pwm\",\"dac\",\"servo\",\"touch\",\"hall\",\"i2c\",\"spi\",\"wifi\",\"bluetooth\",\"ble\",\"websocket\",\"ota\"]";
  json += "}";
  sendRaw(json, source);
}

// ===== HEARTBEAT =====
void handleHeartbeat() {
  if (millis() - lastHeartbeat >= 1000) {
    lastHeartbeat = millis();
    String hb = "{\"event\":\"heartbeat\",\"uptime\":" + String(millis()/1000) + ",\"heap\":" + String(ESP.getFreeHeap()) + "}";
    Serial.println(hb);
    webSocket.broadcastTXT(hb);
  }
}

// ===== CAMERA (ESP32-CAM) =====
#if HAS_CAMERA
void initCamera() {
  camera_config.ledc_channel = LEDC_CHANNEL_0;
  camera_config.ledc_timer = LEDC_TIMER_0;
  camera_config.pin_d0 = 5;
  camera_config.pin_d1 = 18;
  camera_config.pin_d2 = 19;
  camera_config.pin_d3 = 21;
  camera_config.pin_d4 = 36;
  camera_config.pin_d5 = 39;
  camera_config.pin_d6 = 34;
  camera_config.pin_d7 = 35;
  camera_config.pin_xclk = 0;
  camera_config.pin_pclk = 22;
  camera_config.pin_vsync = 25;
  camera_config.pin_href = 23;
  camera_config.pin_sscb_sda = 26;
  camera_config.pin_sscb_scl = 27;
  camera_config.pin_pwdn = 32;
  camera_config.pin_reset = -1;
  camera_config.xclk_freq_hz = 20000000;
  camera_config.pixel_format = PIXFORMAT_JPEG;
  camera_config.frame_size = FRAMESIZE_VGA;
  camera_config.jpeg_quality = 12;
  camera_config.fb_count = 1;
  
  esp_err_t err = esp_camera_init(&camera_config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
  } else {
    camera_initialized = true;
    Serial.println("Camera initialized");
  }
}
#endif

// ===== WEB PAGE =====
String getStatusPage() {
  String page = "<!DOCTYPE html><html><head>";
  page += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  page += "<title>ScratchBridge ESP32</title>";
  page += "<style>body{font-family:sans-serif;max-width:800px;margin:0auto;padding:20px;}";
  page += ".card{background:#f5f5f5;border-radius:8px;padding:16px;margin:10px0;}";
  page += "h1{color:#0066cc;}button{background:#0066cc;color:white;border:none;padding:10px20px;border-radius:4px;cursor:pointer;}";
  page += "</style></head><body>";
  page += "<h1>ScratchBridge ESP32</h1>";
  page += "<div class='card'><h2>Status</h2>";
  page += "<p>Firmware: v" + String(FIRMWARE_VERSION) + "</p>";
  page += "<p>WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "AP Mode") + "</p>";
  page += "<p>IP: " + (WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString()) + "</p>";
  page += "<p>WebSocket Clients: " + String(webSocket.connectedClients()) + "</p>";
  page += "<p>Uptime: " + String(millis()/1000) + "s</p>";
  page += "</div>";
  page += "<div class='card'><h2>Control</h2>";
  page += "<button onclick=\"fetch('/api/command',{method:'POST',body:'{\\\"cmd\\\":\\\"get_info\\\"}'})">Get Info</button>";
  page += " <button onclick=\"if(confirm('Restart?'))fetch('/api/command',{method:'POST',body:'{\\\"cmd\\\":\\\"restart\\\"}'})\">Restart</button>";
  page += "</div>";
  page += "</body></html>";
  return page;
}
