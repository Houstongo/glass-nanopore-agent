# ESP8266 WebSocket 透传桥接

## 作用

这份 Arduino IDE 草图用于把 STM32 `USART3` 发出的 ADC2 时序文本包转发给上位机。

链路如下：

```text
STM32 USART3 -> ESP8266 UART0 -> WebSocket -> 上位机
```

## 当前约定

- WiFi:
  - `XuHou_Group_2.4G`
  - `XH123456`
- STM32 串口波特率:
  - `115200`
- WebSocket 端口:
  - `81`
- 上位机连接地址:
  - `ws://<ESP8266_IP>:81/`

## STM32 输入格式

当前草图按“按行透传”处理串口数据，适配 STM32 侧当前的文本包：

```text
ADC2,seq,drop_count,count,v1,v2,...,v20
```

只要一行以换行符结束，ESP8266 就会原样广播给全部 WebSocket 客户端。

## Arduino IDE 依赖

请确认已经安装：

- ESP8266 开发板包
- `WebSocketsServer` 所在的 `arduinoWebSockets` 库

代码中用到：

- `ESP8266WiFi.h`
- `ESP8266WiFiMulti.h`
- `WebSocketsServer.h`

## 接线

- STM32 `USART3_TX` -> ESP8266 `RX`
- STM32 `USART3_RX` -> ESP8266 `TX`
- 共地

注意：

- 这份草图默认 `UART0` 连接 STM32
- 调试日志走 `Serial1`
- 不要把调试日志输出到和 STM32 共用的串口，否则会污染 ADC2 时序数据

## 当前能力

- 自动连接指定 WiFi
- 开 WebSocket Server
- 串口按行读取
- 收到一整行后广播给所有 WebSocket 客户端
- 预留上位机文本指令反向透传到 STM32

## 当前限制

- 没有本地缓存重发
- 没有本地特征提取
- 没有鉴权
- 没有二进制压缩

第一版目标只是先把 STM32 时序数据稳定送到上位机。
