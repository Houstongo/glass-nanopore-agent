# 上位机-ESP8266-STM32 通信文档

## 1. 目标

本文档用于说明当前项目中：

```text
上位机 <-> ESP8266 <-> STM32
```

之间的通信链路、协议格式、联调步骤和注意事项。

当前目标不是做高速硬实时闭环控制，而是先打通：

```text
STM32 ADC2 时序数据 -> ESP8266 无线转发 -> 上位机接收
```

这条链路。

---

## 2. 通信拓扑

当前链路如下：

```text
STM32 USART3
    ->
ESP8266 UART0
    ->
ESP8266 WebSocket Server
    ->
上位机 WebSocket Client
```

其中：

- STM32 负责采样和生成文本数据包
- ESP8266 负责 WiFi 接入和 WebSocket 转发
- 上位机负责接收、解析、显示和保存

---

## 3. 各层职责

### 3.1 STM32

作用：

- 采集 ADC2 时序数据
- 将数据打包成文本行
- 通过 `USART3` 发送给 ESP8266

当前版本位置：

```text
D:\AntigravityProject\.worktrees\adc2-streaming\firmware\etching_controller
```

关键点：

- `TIM4` 负责固定频率采样
- `ADC2` 为采样源
- `USART3` 专门用于 ESP8266 链路

### 3.2 ESP8266

作用：

- 连接实验室 WiFi
- 从串口读取 STM32 数据
- 以 WebSocket 广播给上位机

代码位置：

```text
D:\AntigravityProject\firmware\esp8266_websocket_bridge\esp8266_websocket_bridge.ino
```

### 3.3 上位机

作用：

- 连接 ESP8266 的 WebSocket 服务
- 接收文本包
- 解析为时序数据
- 保存或送入后续分析/建模模块

注意：

- 当前项目中的 `hardware_bridge.py` 还是 Mock
- 真实接收链路需要你单独接入串流接收代码

相关位置：

```text
D:\AntigravityProject\.worktrees\adc2-streaming\apps\glass_nanopore_agent\core\hardware_bridge.py
```

---

## 4. STM32 -> ESP8266 串口通信

### 4.1 串口用途

当前约定：

- `USART1`：串口屏
- `USART3`：ESP8266 数据链路

### 4.2 串口参数

STM32 `USART3` 当前参数：

```text
波特率: 115200
数据位: 8
停止位: 1
校验位: 无
流控: 无
```

对应代码：

```text
D:\AntigravityProject\.worktrees\adc2-streaming\firmware\etching_controller\Core\Src\usart.c
```

ESP8266 侧保持一致：

```text
Serial.begin(115200)
```

---

## 5. STM32 时序采样逻辑

### 5.1 采样节拍

当前 STM32 侧配置：

- `TIM4` 每 `10 ms` 触发一次
- 即：

```text
100 Hz
```

相关代码：

```text
D:\AntigravityProject\.worktrees\adc2-streaming\firmware\etching_controller\Core\Src\tim.c
D:\AntigravityProject\.worktrees\adc2-streaming\firmware\etching_controller\Callback\TIM\Callback.c
```

### 5.2 打包方式

当前每 `20` 个点打成一包：

```text
20 点 = 200 ms
```

STM32 内使用双缓冲：

- 一个缓冲区正在写
- 一个缓冲区等待主循环发送

如果主循环来不及发，会增加：

```text
adc2_stream_drop_count
```

这表示有整包数据被丢弃。

---

## 6. STM32 发包协议

### 6.1 当前格式

STM32 当前通过 `USART3` 发送文本包，格式为：

```text
ADC2,<seq>,<drop_count>,<count>,<v1>,<v2>,...,<v20>\r\n
```

示例：

```text
ADC2,15,2,20,4095,4092,4087,4050,...,3988
```

### 6.2 字段说明

- `ADC2`
  - 固定包头
- `seq`
  - 包序号
- `drop_count`
  - 从启动到当前累计丢包数
- `count`
  - 当前包的采样点数，当前固定为 `20`
- `v1...v20`
  - ADC2 原始采样值

### 6.3 数据意义

当前数据是：

```text
ADC2 原始整数值
范围大致 0 ~ 4095
```

它不是已经换算成电压的值。  
如果上位机需要换算，可按参考电压自行转换。

---

## 7. ESP8266 WebSocket 转发逻辑

### 7.1 WiFi 配置

当前 ESP8266 固件中写死：

```text
SSID: XuHou_Group_2.4G
Password: XH123456
```

### 7.2 WebSocket 服务

ESP8266 在本地开启：

```text
端口: 81
协议: WebSocket
地址: ws://<ESP8266_IP>:81/
```

### 7.3 转发方式

ESP8266 的第一版逻辑是：

1. 从 UART0 读串口数据
2. 按 `\n` 判定一整行结束
3. 把这一整行原样广播给所有 WebSocket 客户端

也就是说：

```text
ESP8266 不改协议，不包装 JSON，不做本地分析
```

当前就是最小透传桥接。

---

## 8. 接线说明

建议接线：

```text
STM32 USART3_TX -> ESP8266 RX
STM32 USART3_RX -> ESP8266 TX
STM32 GND -> ESP8266 GND
```

注意事项：

- 电平要兼容
- 供电要稳定
- 必须共地

---

## 9. 上位机接收方式

上位机需要作为 WebSocket Client 连接：

```text
ws://<ESP8266_IP>:81/
```

接收到的数据是一行一包的文本。  
上位机应做以下处理：

1. 按文本行接收
2. 按逗号分割
3. 校验包头是否为 `ADC2`
4. 解析：
   - 序号
   - 丢包数
   - 点数
   - 采样值数组
5. 存盘或送图表显示

---

## 10. 联调步骤

### 10.1 STM32 侧

1. 烧录 `adc2-streaming` 版本固件
2. 确认 `USART3` 已接到 ESP8266
3. 确认 `TIM4` 已启动
4. 确认 ADC2 能正常出值

### 10.2 ESP8266 侧

1. 用 Arduino IDE 烧录：

```text
D:\AntigravityProject\firmware\esp8266_websocket_bridge\esp8266_websocket_bridge.ino
```

2. 观察调试口输出 IP
3. 确认已连上：

```text
XuHou_Group_2.4G
```

### 10.3 上位机侧

1. 查到 ESP8266 当前 IP
2. 用 WebSocket 客户端连接：

```text
ws://<ESP8266_IP>:81/
```

3. 观察是否收到：

```text
ADC2,...
```

形式的文本包

---

## 11. 当前链路特性

### 11.1 优点

- 实现简单
- 易于联调
- 能快速看到 STM32 时序流

### 11.2 限制

- 采样频率目前只有 `100 Hz`
- 每 `20` 点才发一包
- 主循环阻塞可能导致丢包
- 不适合高速实时闭环控制
- 更适合：
  - 慢时序记录
  - 状态分析
  - 组间/根间参数优化

---

## 12. 常见问题

### 12.1 上位机收不到数据

优先检查：

- STM32 是否真的在发 `USART3`
- ESP8266 是否连上 WiFi
- WebSocket 是否连的是正确 IP 和端口
- 接线是否正确
- 是否共地

### 12.2 收到的数据断断续续

优先检查：

- `drop_count` 是否在增长
- 主循环是否因为 `HAL_Delay(500)` / `HAL_Delay(1000)` 阻塞过久
- WiFi 是否稳定

### 12.3 数据值异常

优先检查：

- ADC2 输入电路
- 参考电压
- 接触状态
- 交流刻蚀下信号是否本身波动较大

---

## 13. 当前最准确的定位

这条链路当前更适合定义为：

```text
STM32 ADC2 时序数据无线透传链路
```

而不是：

```text
高速实时控制链路
```

第一阶段目标应是：

- 先稳定收到数据
- 先能保存完整实验记录
- 再做上位机建模和宏观调参

---

## 14. 相关文件

STM32 最新时序版本：

```text
D:\AntigravityProject\.worktrees\adc2-streaming\firmware\etching_controller
```

ESP8266 草图：

```text
D:\AntigravityProject\firmware\esp8266_websocket_bridge\esp8266_websocket_bridge.ino
```

ESP8266 说明：

```text
D:\AntigravityProject\firmware\esp8266_websocket_bridge\README.md
```
