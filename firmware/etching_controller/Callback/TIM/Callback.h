//
// Created by 86381 on 24-5-9.
//

#ifndef UNTITLE4_CALLBACK_H
#define UNTITLE4_CALLBACK_H
#include "main.h"
#include "tim.h"
extern uint32_t Pulse_Cnt_Tim3;
extern uint16_t Tim3Flags;
extern uint32_t Pulse_Cnt3;
extern uint32_t pulse_length;
extern uint32_t Pulse_Cnt_Tim2;
extern uint32_t Pulse_Cnt2;
extern uint16_t Tim2Flags;
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim);
#endif //UNTITLE4_CALLBACK_H

