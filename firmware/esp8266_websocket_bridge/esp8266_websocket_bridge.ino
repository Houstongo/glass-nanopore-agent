#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WebSocketsServer.h>

ESP8266WiFiMulti wifiMulti;
WebSocketsServer webSocket = WebSocketsServer(81);

// STM32 通过 UART0 与 ESP8266 相连，波特率与 USART3 保持一致。
static const uint32_t STM32_BAUD_RATE = 115200;
// 单行文本包足够容纳一帧 ADC2 数据，留一点冗余。
static const size_t LINE_BUFFER_SIZE = 256;

char lineBuffer[LINE_BUFFER_SIZE];
size_t lineLength = 0;
uint32_t forwardedLineCount = 0;
uint32_t droppedLineCount = 0;
unsigned long lastWifiRetryMs = 0;

static void logDebug(const String& message) {
  Serial1.println(message);
}

static void resetLineBuffer() {
  lineLength = 0;
  lineBuffer[0] = '\0';
}

static void forwardLineToClients() {
  if (lineLength == 0) {
    return;
  }

  lineBuffer[lineLength] = '\0';
  webSocket.broadcastTXT(lineBuffer);
  forwardedLineCount++;
  resetLineBuffer();
}

static void handleSerialInput() {
  while (Serial.available() > 0) {
    char incoming = static_cast<char>(Serial.read());

    if (incoming == '\r') {
      continue;
    }

    if (incoming == '\n') {
      forwardLineToClients();
      continue;
    }

    if (lineLength >= (LINE_BUFFER_SIZE - 1)) {
      droppedLineCount++;
      resetLineBuffer();
      continue;
    }

    lineBuffer[lineLength++] = incoming;
  }
}

static void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if (now - lastWifiRetryMs < 3000UL) {
    return;
  }

  lastWifiRetryMs = now;
  logDebug("WiFi reconnecting...");
  wifiMulti.run();
}

// 尝试将 payload 解析为 8 字节十六进制控制帧（空格或逗号分隔）。
// 成功时填入 outBuf[8] 并返回 true；格式不符则返回 false。
static bool tryParseHexFrame(const uint8_t* payload, size_t length, uint8_t outBuf[8]) {
  // 复制到临时 char 缓冲，便于 strtok 切分。
  char tmp[64];
  if (length == 0 || length >= sizeof(tmp)) {
    return false;
  }
  memcpy(tmp, payload, length);
  tmp[length] = '\0';

  uint8_t vals[8];
  uint8_t count = 0;
  char* token = strtok(tmp, " ,;");
  while (token != nullptr && count < 9) {
    char* end = nullptr;
    long v = strtol(token, &end, 16);
    if (end == token || v < 0 || v > 0xFF) {
      return false;
    }
    if (count < 8) {
      vals[count] = static_cast<uint8_t>(v);
    }
    count++;
    token = strtok(nullptr, " ,;");
  }

  if (count != 8) {
    return false;
  }
  // 校验帧头帧尾
  if (vals[0] != 0xFF || vals[7] != 0xFF) {
    return false;
  }

  memcpy(outBuf, vals, 8);
  return true;
}

static void onWebSocketEvent(uint8_t clientId, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(clientId);
      logDebug("WS connected: #" + String(clientId) + " " + ip.toString());
      break;
    }
    case WStype_DISCONNECTED:
      logDebug("WS disconnected: #" + String(clientId));
      break;
    case WStype_TEXT: {
      if (length == 0 || payload == nullptr) {
        break;
      }
      uint8_t frameBuf[8];
      if (tryParseHexFrame(payload, length, frameBuf)) {
        // 合法的 8 字节控制帧：直接以二进制写入串口，不加换行。
        // STM32 DMA 固定接收 8 字节，换行会导致边界错位。
        Serial.write(frameBuf, 8);
        logDebug("[ctrl] hex frame -> 8 bytes binary");
      } else {
        // 非控制帧（如 SCPI 文本指令）：原样透传并补换行。
        Serial.write(payload, length);
        Serial.write('\n');
        logDebug("[pass] text: " + String(reinterpret_cast<char*>(payload)).substring(0, 32));
      }
      break;
    }
    default:
      break;
  }
}

void setup() {
  // UART0 连接 STM32，不能打印调试日志。
  Serial.begin(115200);
  Serial.setDebugOutput(false);
  // UART1 仅 TX，可接 USB-TTL 做调试，不影响 STM32 链路。
  Serial1.begin(115200);

  resetLineBuffer();

  WiFi.mode(WIFI_STA);
  wifiMulti.addAP("XuHou_Group_2.4G", "XH123456");

  logDebug("ESP8266 websocket bridge booting...");

  while (wifiMulti.run() != WL_CONNECTED) {
    delay(500);
    logDebug("Connecting WiFi...");
  }

  logDebug("WiFi connected: " + WiFi.localIP().toString());

  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
  logDebug("WebSocket ready on ws://" + WiFi.localIP().toString() + ":81/");
}

void loop() {
  wifiMulti.run();
  ensureWifiConnected();
  webSocket.loop();
  handleSerialInput();
}
