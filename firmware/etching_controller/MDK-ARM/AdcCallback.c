#include "AdcCallback.h"
void HAL_ADC_LevelOutOfWindowCallback(ADC_HandleTypeDef* hadc){
//    if (hadc->Instance == ADC1){
//        if(adc_buff[0] > 2000 && HAL_GPIO_ReadPin(MOTOR1_IN_DIR_GPIO_Port, MOTOR1_IN_DIR_Pin) == RESET){
//            HAL_GPIO_WritePin(MOTOR1_IN_DIR_GPIO_Port, MOTOR1_IN_DIR_Pin, GPIO_PIN_SET);
//            HAL_TIM_PWM_Stop(&htim3, TIM_CHANNEL_1);
//        } else if (adc_buff[1] > 2000 && HAL_GPIO_ReadPin(MOTOR1_IN_DIR_GPIO_Port, MOTOR1_IN_DIR_Pin) == SET){
//            HAL_GPIO_WritePin(MOTOR1_IN_DIR_GPIO_Port, MOTOR1_IN_DIR_Pin, GPIO_PIN_RESET);
//            HAL_TIM_PWM_Stop(&htim3, TIM_CHANNEL_1);
//        }
//        adc_buff[0] = 0;
//        adc_buff[1] = 0;
////        HAL_ADC_Stop_DMA(&hadc1);


////        HAL_ADC_Stop_IT(&hadc1);
//    }
    if (hadc -> Instance == ADC2)
			{
			if (HAL_ADC_GetValue(&hadc2) < 1000){
				isPowered = 1;
        }
    }
}
//void HAL_ADC_ConvCpltCallback(ADC_HandleTypeDef* hadc){
//		isPowered = 1;
//		uint16_t zx = 0;
//		zx =HAL_ADC_GetValue(&hadc2);
//     printf("%d",zx);
//	printf("--------");
//	a = 1; 
//}
