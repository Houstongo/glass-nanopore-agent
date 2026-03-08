# Firmware ADC2 Streaming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add fixed-rate ADC2 time-series sampling and USART3-based ESP telemetry to the STM32 etching controller without changing existing hardware or breaking ADC2 touch detection.

**Architecture:** Keep `USART1` dedicated to the serial screen and add `USART3` as the dedicated ESP link. Sample `ADC2` at a fixed rate from a timer interrupt into a software buffer, then batch-send packets from the main loop over `USART3`. Preserve the existing ADC2 analog watchdog path for contact detection.

**Tech Stack:** STM32Cube HAL (STM32F1), CubeMX-generated peripheral init, C/C++, timer interrupts, UART telemetry

---

### Task 1: Enable USART3 for ESP telemetry

**Files:**
- Modify: `firmware/etching_controller/Core/Inc/usart.h`
- Modify: `firmware/etching_controller/Core/Src/usart.c`
- Modify: `firmware/etching_controller/Core/Inc/main.h` (if PB10/PB11 pin aliases are missing)
- Reference: `firmware/etching_controller/untitle4.ioc`

**Step 1: Record the failing baseline**

Expected current state:
- Only `USART1` exists in generated code
- No `huart3` handle or `MX_USART3_UART_Init()` exists

**Step 2: Add minimal USART3 declarations**

- Declare `extern UART_HandleTypeDef huart3;`
- Add `void MX_USART3_UART_Init(void);`

**Step 3: Add minimal USART3 initialization**

- Add `huart3` definition in `usart.c`
- Initialize `USART3` at `115200`, `8N1`, `TX_RX`
- Add MSP init/deinit for `PB10/PB11`

**Step 4: Verify by compile inspection**

Expected result:
- `huart3` and `MX_USART3_UART_Init()` are available to firmware code
- `USART1` screen path remains unchanged

### Task 2: Add fixed-rate ADC2 software buffering

**Files:**
- Modify: `firmware/etching_controller/Core/Src/main.c`
- Modify: `firmware/etching_controller/Callback/TIM/Callback.c`
- Modify: `firmware/etching_controller/Callback/TIM/Callback.h` (if externs/prototypes are needed)

**Step 1: Record the failing baseline**

Expected current state:
- No ADC2 streaming buffer exists
- No timer callback currently samples `ADC2` into a packet buffer

**Step 2: Add minimal buffer state**

Add globals:
- `uint16_t adc2_stream_buffer[20]`
- `volatile uint8_t adc2_stream_index`
- `volatile uint8_t adc2_chunk_ready`
- `volatile uint32_t adc2_packet_seq`

**Step 3: Add minimal timer-driven sampling**

- Choose one timer as the sampling timer
- In `HAL_TIM_PeriodElapsedCallback()`, read `HAL_ADC_GetValue(&hadc2)`
- Store it into the buffer
- When 20 points are buffered, set `adc2_chunk_ready = 1`

**Step 4: Verify by code-path review**

Expected result:
- Sampling path is lightweight
- No UART transmit occurs inside the timer interrupt
- Existing TIM2/TIM3 motor logic still runs as before

### Task 3: Add USART3 packet sending from main loop

**Files:**
- Modify: `firmware/etching_controller/Core/Src/main.c`

**Step 1: Record the failing baseline**

Expected current state:
- No dedicated telemetry send function exists
- ADC values are only sent to the serial screen via `printf("page1...")`

**Step 2: Add minimal send helper**

- Create a `SendAdc2Chunk()` helper that serializes one 20-point packet
- First implementation may use a simple text packet for validation:
  - `ADC2,<seq>,<count>,v1,v2,...,v20\r\n`

**Step 3: Send only from main loop**

- In `while(1)`, check `adc2_chunk_ready`
- Clear the flag
- Send the packet over `huart3`

**Step 4: Verify by code-path review**

Expected result:
- Screen traffic stays on `USART1`
- Telemetry traffic uses only `USART3`
- Main loop is responsible for UART transmission, not interrupts

### Task 4: Preserve ADC2 watchdog contact detection

**Files:**
- Modify: `firmware/etching_controller/Callback/ADC/AdcCallback.c`
- Reference: `firmware/etching_controller/Core/Src/adc.c`

**Step 1: Record the failing baseline**

Expected current state:
- ADC2 watchdog sets `isPowered` when the input crosses the contact threshold

**Step 2: Keep the existing watchdog path intact**

- Do not remove `HAL_ADC_LevelOutOfWindowCallback()` logic for ADC2
- Only adjust comments or minor glue if required

**Step 3: Verify by review**

Expected result:
- ADC2 remains the contact-detection source
- Streaming is additive, not a replacement for the control path

### Task 5: Verification and handoff

**Files:**
- Reference: `firmware/etching_controller/Core/Src/main.c`
- Reference: `firmware/etching_controller/Core/Src/usart.c`
- Reference: `firmware/etching_controller/Callback/TIM/Callback.c`
- Reference: `firmware/etching_controller/Callback/ADC/AdcCallback.c`

**Step 1: Run static verification**

Run:
- Firmware file review for new `USART3` init path
- Firmware file review for new ADC2 sampling path
- Optional compile check if toolchain is available

**Step 2: Confirm expected behavior**

Expected:
- `USART1` still serves the screen
- `USART3` is dedicated to ESP telemetry
- ADC2 sampling is periodic and buffered
- Existing touch-detection behavior remains intact

**Step 3: Commit**

```bash
git add firmware/etching_controller/Core/Inc/usart.h \
        firmware/etching_controller/Core/Src/usart.c \
        firmware/etching_controller/Core/Src/main.c \
        firmware/etching_controller/Callback/TIM/Callback.c \
        firmware/etching_controller/Callback/ADC/AdcCallback.c \
        docs/plans/2026-03-08-firmware-adc2-streaming-implementation.md
git commit -m "feat: stream adc2 telemetry over usart3"
```
