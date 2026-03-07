#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// ===== 运行时开关 =====
// 1：开启调试日志（走 Serial1，仅 TX）；0：关闭调试日志
#define DEBUG_MODE 0

// 必须与 STM32 USART 波特率保持一致
#define STM32_BAUDRATE 9600

// STM32 Etching_flag 兼容开关：
// 首包发 8 字节，后续发 7 字节（因为 STM32 回调里将 DMA 重启为 7 字节）
#define STM32_DMA_QUIRK_MODE 1

#if DEBUG_MODE
  #define DEBUG_PORT Serial1
  #define DEBUG_PRINT(...)   DEBUG_PORT.print(__VA_ARGS__)
  #define DEBUG_PRINTLN(...) DEBUG_PORT.println(__VA_ARGS__)
  #define DEBUG_PRINTF(...)  DEBUG_PORT.printf(__VA_ARGS__)
#else
  #define DEBUG_PRINT(...)
  #define DEBUG_PRINTLN(...)
  #define DEBUG_PRINTF(...)
#endif

const char* WIFI_SSID = "XuHou_Group_2.4G";
const char* WIFI_PASS = "XH123456";

// 固定 IP 配置（按你的路由网段调整）
const IPAddress WIFI_LOCAL_IP(192, 168, 1, 137);
const IPAddress WIFI_GATEWAY(192, 168, 1, 1);
const IPAddress WIFI_SUBNET(255, 255, 255, 0);
const IPAddress WIFI_DNS1(223, 5, 5, 5);
const IPAddress WIFI_DNS2(8, 8, 8, 8);

ESP8266WiFiMulti wifiMulti;
WebSocketsServer webSocket(81);

// 单活动客户端策略：255 表示当前无活动客户端
uint8_t activeClient = 255;

unsigned long lastWifiCheckMs = 0;
bool wifiWasConnected = false;
bool stm32FramePrimed = false;

// STM32 回传解析缓冲，支持 '\n' 与 0xFF 0xFF 0xFF 两种结束符
char stm32MsgBuf[256];
size_t stm32MsgLen = 0;
uint8_t ffTailCount = 0;

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length);
void sendStatusToAll(const char* status, const char* msg);
void ensureWifiConnected();
void sendFrameToStm32(const uint8_t* frame8);
void pumpStm32Feedback();
bool buildStm32Frame(JsonDocument& doc, uint8_t* txBuf);

void setup() {
  Serial.begin(STM32_BAUDRATE);
  Serial.setTimeout(60);
#if DEBUG_MODE
  DEBUG_PORT.begin(115200);
#endif
  delay(10);

  DEBUG_PRINTLN("\n\n====================================");
  DEBUG_PRINTLN("[SYS] Etching WiFi relay starting");
  DEBUG_PRINTLN("====================================");

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  if (!WiFi.config(WIFI_LOCAL_IP, WIFI_GATEWAY, WIFI_SUBNET, WIFI_DNS1, WIFI_DNS2)) {
    DEBUG_PRINTLN("[WIFI] Static IP config failed, fallback to DHCP");
  }
#ifdef WIFI_NONE_SLEEP
  WiFi.setSleepMode(WIFI_NONE_SLEEP);
#endif

  wifiMulti.addAP(WIFI_SSID, WIFI_PASS);
  DEBUG_PRINT("[WIFI] Connecting to SSID [");
  DEBUG_PRINT(WIFI_SSID);
  DEBUG_PRINT("] ");

  while (wifiMulti.run() != WL_CONNECTED) {
    delay(500);
    DEBUG_PRINT(".");
  }

  wifiWasConnected = true;
  DEBUG_PRINTLN("\n[WIFI] Connected");
  DEBUG_PRINT("[WIFI] Local IP: ");
  DEBUG_PRINTLN(WiFi.localIP());

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  webSocket.enableHeartbeat(15000, 3000, 2);

  DEBUG_PRINTLN("[WS] WebSocket server listening on :81");
}

void loop() {
  webSocket.loop();

  if (millis() - lastWifiCheckMs >= 2000) {
    lastWifiCheckMs = millis();
    ensureWifiConnected();
  }

  pumpStm32Feedback();
}

void ensureWifiConnected() {
  wl_status_t st = WiFi.status();
  if (st == WL_CONNECTED) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      DEBUG_PRINTLN("[WIFI] Reconnected");
      DEBUG_PRINT("[WIFI] Local IP: ");
      DEBUG_PRINTLN(WiFi.localIP());
      sendStatusToAll("wifi_reconnected", "WiFi reconnected");
    }
    return;
  }

  if (wifiWasConnected) {
    wifiWasConnected = false;
    DEBUG_PRINTLN("[WIFI] Lost connection, reconnecting...");
    sendStatusToAll("wifi_lost", "WiFi lost, reconnecting");
  }
  wifiMulti.run();
}

void sendStatusToAll(const char* status, const char* msg) {
  StaticJsonDocument<128> doc;
  doc["status"] = status;
  doc["msg"] = msg;

  String out;
  serializeJson(doc, out);
  webSocket.broadcastTXT(out);
}

bool buildStm32Frame(JsonDocument& doc, uint8_t* txBuf) {
  // 帧格式：[FF][depthH][depthL][time][func][counts][flag][FF]
  memset(txBuf, 0, 8);
  txBuf[0] = 0xFF;
  txBuf[7] = 0xFF;

  // 自动模式：兼容 depth/time 与 LABOS 的 depth_um/time_s
  if (doc.containsKey("depth") || doc.containsKey("depth_um")) {
    uint16_t depth = doc.containsKey("depth") ? (uint16_t)doc["depth"] : (uint16_t)doc["depth_um"];
    uint8_t t = doc.containsKey("time") ? (uint8_t)doc["time"] : (uint8_t)(doc["time_s"] | 0);
    uint8_t counts = (uint8_t)(doc["counts"] | 1);

    txBuf[1] = (depth >> 8) & 0xFF;
    txBuf[2] = depth & 0xFF;
    txBuf[3] = t;
    txBuf[4] = 0x00;
    txBuf[5] = counts;
    txBuf[6] = 0x10;
    return true;
  }

  // 手动模式：兼容 cmd 与 flag
  if (doc.containsKey("cmd") || doc.containsKey("flag")) {
    uint8_t cmd = doc.containsKey("cmd") ? (uint8_t)doc["cmd"] : (uint8_t)doc["flag"];
    if (cmd >= 1 && cmd <= 10) {
      txBuf[4] = 0x01;
      txBuf[6] = cmd;
      return true;
    }
  }

  return false;
}

void sendFrameToStm32(const uint8_t* frame8) {
#if STM32_DMA_QUIRK_MODE
  if (!stm32FramePrimed) {
    Serial.write(frame8, 8);
    stm32FramePrimed = true;
  } else {
    Serial.write(frame8, 7);
  }
#else
  Serial.write(frame8, 8);
#endif
}

void pumpStm32Feedback() {
  while (Serial.available() > 0) {
    uint8_t b = (uint8_t)Serial.read();

    if (b == '\n') {
      if (stm32MsgLen > 0) {
        stm32MsgBuf[stm32MsgLen] = '\0';
        String feedback = String(stm32MsgBuf);
        feedback.trim();
        if (feedback.length() > 0 && activeClient != 255) {
          webSocket.sendTXT(activeClient, feedback);
        }
#if DEBUG_MODE
        DEBUG_PRINT("[STM32] -> ");
        DEBUG_PRINTLN(feedback);
#endif
      }
      stm32MsgLen = 0;
      ffTailCount = 0;
      continue;
    }

    if (b == 0xFF) {
      ffTailCount++;
      if (ffTailCount >= 3) {
        if (stm32MsgLen > 0) {
          stm32MsgBuf[stm32MsgLen] = '\0';
          String feedback = String(stm32MsgBuf);
          feedback.trim();
          if (feedback.length() > 0 && activeClient != 255) {
            webSocket.sendTXT(activeClient, feedback);
          }
#if DEBUG_MODE
          DEBUG_PRINT("[STM32] -> ");
          DEBUG_PRINTLN(feedback);
#endif
        }
        stm32MsgLen = 0;
        ffTailCount = 0;
      }
      continue;
    }

    ffTailCount = 0;
    if (stm32MsgLen < sizeof(stm32MsgBuf) - 1) {
      stm32MsgBuf[stm32MsgLen++] = (char)b;
    } else {
      stm32MsgLen = 0;
      ffTailCount = 0;
    }
  }
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED: {
      DEBUG_PRINTF("[WS] [DISCONNECT] Client [%u] disconnected\n", num);
      if (activeClient == num) {
        activeClient = 255;
        sendStatusToAll("disconnected", "active client disconnected");
      } else {
        sendStatusToAll("disconnected", "non-active client disconnected");
      }
      break;
    }

    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      DEBUG_PRINTF("[WS] [CONNECT] Client [%u] connected, IP: %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);

      // 保持单客户端占用：若已有活动客户端，则拒绝后续连接
      if (activeClient != 255 && activeClient != num) {
        webSocket.sendTXT(num, "{\"status\":\"busy\",\"msg\":\"gateway already occupied\"}");
        webSocket.disconnect(num);
        break;
      }

      activeClient = num;
      webSocket.sendTXT(num, "{\"status\":\"connected\",\"msg\":\"ESP8266 Ready\"}");
      sendStatusToAll("connected", "active client online");
      break;
    }

    case WStype_TEXT: {
      if (num != activeClient) {
        DEBUG_PRINTF("[WS] [DROP] Ignore command from non-active client [%u]\n", num);
        return;
      }

#if DEBUG_MODE
      DEBUG_PRINTF("[WS] [RX] Client [%u] payload: %s\n", num, payload);
#endif

      DynamicJsonDocument doc(384);
      DeserializationError error = deserializeJson(doc, (char*)payload, length);
      if (error) {
        webSocket.sendTXT(num, "{\"status\":\"ERR\",\"msg\":\"JSON parse failed\"}");
        break;
      }

      uint8_t txBuf[8];
      bool ok = buildStm32Frame(doc, txBuf);
      if (!ok) {
        webSocket.sendTXT(num, "{\"status\":\"ERR\",\"msg\":\"invalid command\"}");
        break;
      }

#if DEBUG_MODE
      DEBUG_PRINT("[TX] -> STM32 [ ");
      for (int i = 0; i < 8; i++) {
        if (txBuf[i] < 0x10) DEBUG_PRINT("0");
        DEBUG_PRINT(txBuf[i], HEX);
        DEBUG_PRINT(" ");
      }
      DEBUG_PRINTLN("]");
#endif

      sendFrameToStm32(txBuf);
      webSocket.sendTXT(num, "{\"status\":\"OK\",\"msg\":\"command sent to STM32\"}");
      break;
    }

    default:
      break;
  }
}
