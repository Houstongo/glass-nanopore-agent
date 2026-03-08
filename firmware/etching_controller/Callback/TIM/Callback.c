//
// Created by 86381 on 24-5-9.
//

#include "Callback.h"

// ADC2 时序采样状态由 main.c 持有，TIM4 中断只负责填充缓冲区。
extern ADC_HandleTypeDef hadc2;
extern volatile uint8_t adc2_stream_ready_buffer;
extern volatile uint8_t adc2_stream_write_buffer;
extern volatile uint8_t adc2_stream_index;
extern volatile uint32_t adc2_stream_drop_count;
extern uint16_t adc2_stream_buffers[2][20];

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim){
    /*每输出一个脉冲进入一次中断，Pulse_Cnt用于计数已经产生的脉冲个数*/
    /*Pulse_exp_Cnt为需要产生的脉冲个数*/
    /*当Pulse_Cnt与Pulse_exp_Cnt为相等时，表示已经产生了预期数目的脉冲数，从而停止PWM输出*/
    // TIM4 每 10ms 采一个 ADC2 点，满 20 点后交给主循环发包。
    if(htim->Instance == TIM4)
    {
        uint8_t write_buffer = adc2_stream_write_buffer;

        adc2_stream_buffers[write_buffer][adc2_stream_index++] = (uint16_t)HAL_ADC_GetValue(&hadc2);

        if (adc2_stream_index >= 20U) {
            if (adc2_stream_ready_buffer == 0xFFU) {
                adc2_stream_ready_buffer = write_buffer;
                adc2_stream_write_buffer ^= 1U;
            } else {
                adc2_stream_drop_count++;
            }
            adc2_stream_index = 0;
        }
        return;
    }
    if(htim->Instance == TIM2)
    {
        Pulse_Cnt2++;
        if (Pulse_Cnt2 == Pulse_Cnt_Tim2){
            Tim2Flags = 1;
        }
    }
    if(htim -> Instance == TIM3){
        if (Tim3Flags == 0){
            Pulse_Cnt_Tim3++;
        }else if (Tim3Flags == 1){
            Pulse_Cnt3++;
            if (Pulse_Cnt3 == pulse_length){
                Tim3Flags = 2;
            }
        }else if (Tim3Flags == 2){
            Pulse_Cnt3++;
            if (Pulse_Cnt3 == Pulse_Cnt_Tim3){
                Tim3Flags = 0;
            }
        }
    }
}
