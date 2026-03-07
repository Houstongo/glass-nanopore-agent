//
// Created by 86381 on 24-5-9.
//

#include "Callback.h"

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim){
    /*每输出一个脉冲进入一次中断，Pulse_Cnt用于计数已经产生的脉冲个数*/
    /*Pulse_exp_Cnt为需要产生的脉冲个数*/
    /*当Pulse_Cnt与Pulse_exp_Cnt为相等时，表示已经产生了预期数目的脉冲数，从而停止PWM输出*/
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