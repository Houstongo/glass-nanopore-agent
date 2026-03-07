/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2024 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "adc.h"
#include "dma.h"
#include "tim.h"
#include "usart.h"
#include "gpio.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include "Callback.h"
#include "AdcCallback.h"
#include "usartCallback.h"
#include <stdio.h>
#include <string.h>
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */
uint32_t Pulse_Cnt_Tim3=0;
uint32_t Pluse_Tim2_one = 20;//旋转一个脉冲的时间 ms
uint32_t Pulse_Cnt3 = 0;
uint32_t Pulse_Cnt_Tim2_33=33;
uint32_t Pulse_Cnt_Tim2_34=34;
uint32_t scan = 1;
uint32_t Pulse_Cnt2 = 0;
uint16_t adc_buff[2] = {0,0};
uint16_t echinglength = 0;
uint16_t echingtime = 0;
uint16_t echingcounts = 0;
uint32_t pulse_length = 0;
uint8_t RxBuf[8]={0,0,0,0,0,0,0,0};
uint16_t isPowered = 0;
uint16_t Flags = 20;
uint16_t State = 0;
uint16_t Twins = 0;
uint16_t AC_DC = 0;
uint16_t Tim3Flags = 0;
uint16_t Tim2Flags = 0;
uint16_t light = 0;
uint16_t a = 0;
/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/

/* USER CODE BEGIN PV */


/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
/* USER CODE BEGIN PFP */
uint32_t CalPulseTime(uint32_t distance);
/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */

/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */
  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_TIM3_Init();
  MX_ADC1_Init();
  MX_TIM5_Init();
  MX_ADC2_Init();
  MX_USART1_UART_Init();
  MX_TIM2_Init();
  /* USER CODE BEGIN 2 */

// open the light 开灯
//	HAL_GPIO_WritePin(LIGHT_POS_GPIO_Port, LIGHT_POS_Pin, GPIO_PIN_SET);
//	HAL_TIM_PWM_Start(&htim5, TIM_CHANNEL_2);

// 串口测试
HAL_UART_Transmit(&huart1, (uint8_t *)"Hello World!\r\n", 14, 1000);

//旋转
	HAL_GPIO_WritePin(MOTOR2_IN_ENA_GPIO_Port, MOTOR2_IN_ENA_Pin, GPIO_PIN_SET);
	HAL_GPIO_WritePin(MOTOR1_IN_ENA_GPIO_Port, MOTOR1_IN_ENA_Pin, GPIO_PIN_SET);


// 开启usart dma模式	
	HAL_UART_Receive_DMA(&huart1, (uint8_t *)&RxBuf, 8);

	HAL_ADCEx_Calibration_Start(&hadc2);
	HAL_ADC_Start_IT(&hadc2);
	// 上拉第一个继电器(接ADC) 下拉第二个继电器(断电)
	HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_SET);
	HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_RESET);
	HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_SET);
	HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_RESET);
	HAL_Delay(500);
	HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_RESET);
	HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_RESET);
	HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_RESET);
	HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_RESET);
	// 输出初始ADC信号
	printf("page1.n3.val=%d\xff\xff\xff",HAL_ADC_GetValue(&hadc2));
	printf("page1.n4.val=%d\xff\xff\xff",isPowered);
  /* USER CODE END 2 */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */

  while (1)
  {
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
//		printf("page1.n3.val=%d\xff\xff\xff",HAL_ADC_GetValue(&hadc2));
//		printf("page1.n4.val=%d\xff\xff\xff",isPowered);
//		HAL_Delay(500);
		if (Flags == 1){
				HAL_GPIO_WritePin(MOTOR2_IN_DIR_GPIO_Port, MOTOR2_IN_DIR_Pin, GPIO_PIN_SET);
				HAL_TIM_PWM_Start(&htim2,TIM_CHANNEL_1);
				Flags = 0;
		}else if (Flags == 2){
				HAL_GPIO_WritePin(MOTOR2_IN_DIR_GPIO_Port, MOTOR2_IN_DIR_Pin, GPIO_PIN_RESET);
				HAL_TIM_PWM_Start(&htim2,TIM_CHANNEL_1);
				Flags = 0;
		}else if (Flags == 3){
				HAL_TIM_PWM_Stop(&htim2,TIM_CHANNEL_1);
				Flags = 0;
		}else if (Flags == 5){
				HAL_GPIO_WritePin(MOTOR1_IN_DIR_GPIO_Port, MOTOR1_IN_DIR_Pin, GPIO_PIN_RESET); // 向上
				HAL_TIM_PWM_Start(&htim3,TIM_CHANNEL_1);
				Flags = 0;
		}else if (Flags == 6){
				HAL_GPIO_WritePin(MOTOR1_IN_DIR_GPIO_Port, MOTOR1_IN_DIR_Pin, GPIO_PIN_SET); // 向下
				HAL_TIM_PWM_Start(&htim3,TIM_CHANNEL_1);
				Flags = 0;
		}else if (Flags == 7){
				HAL_TIM_PWM_Stop(&htim3,TIM_CHANNEL_1);
				Flags = 0;
		}else if (Flags == 16){
				printf("page1.n3.val=%d\xff\xff\xff",HAL_ADC_GetValue(&hadc2));
				printf("page1.n4.val=%d\xff\xff\xff",isPowered);
			if (Twins == 1) echingcounts = echingcounts * 2;
				for (int i = 0; i < echingcounts; ++i) {
						// 下拉第一个继电器(接ADC) 上拉第二个继电器(通电)
						HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_SET);
						HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_SET);
						HAL_Delay(500);
						HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_RESET);
						HAL_ADCEx_Calibration_Start(&hadc2);
						HAL_ADC_Start_IT(&hadc2);
						HAL_GPIO_WritePin(MOTOR1_IN_DIR_GPIO_Port, MOTOR1_IN_DIR_Pin, GPIO_PIN_RESET); // 向上
						HAL_TIM_Base_Start_IT(&htim3);
						Pulse_Cnt_Tim3 = 0;
						HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);
						while (isPowered == 0){
							if (State == 1) break;
							HAL_Delay(10);
						}; // 等待接触
						HAL_TIM_PWM_Stop(&htim3, TIM_CHANNEL_1);
						HAL_TIM_Base_Stop_IT(&htim3);
						printf("page1.n3.val=%d\xff\xff\xff", HAL_ADC_GetValue(&hadc2));
						printf("page1.n4.val=%d\xff\xff\xff",isPowered);
						// 如果刻蚀深度为0，则直接联通交流电刻蚀；如果刻蚀深度不为0，则先关闭电路，等到达刻蚀深度再打开电路，并联接交流电刻蚀
						if (echinglength != 0){
								//下拉第二个继电器（断电）
								HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_SET);
								HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_RESET);
								HAL_Delay(500);
								HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_RESET);
								HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_RESET);
								if (State == 1) {
									isPowered = 0;
									Pulse_Cnt_Tim3 = 0;
									printf("page1.n4.val=%d\xff\xff\xff",isPowered);
									break;
								}
								pulse_length = (echinglength * 400) / 1000; // 计算刻蚀深度需要的脉冲数 400是转一圈需要的脉冲 然后上升到需要刻蚀的位置
								HAL_TIM_Base_Start_IT(&htim3);
								HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);
								uint32_t pulse_time = CalPulseTime(echinglength);
								HAL_Delay(pulse_time);
								HAL_TIM_PWM_Stop(&htim3,TIM_CHANNEL_1);
								HAL_TIM_Base_Stop_IT(&htim3);
						}
						// 上拉第一个继电器（接交流电） 上拉第二个继电器（通电） 开始刻蚀
						if (AC_DC == 0){
							HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_RESET);
							HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_SET);								
						}else if (AC_DC == 1){
							HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_SET);
							HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_RESET);									
						}
						HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_SET);
						HAL_Delay(500);
						HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_RESET);
						for (uint32_t i = 0; i < echingtime; i++){
							HAL_Delay(1000);
							if (State == 1 || State == 2) break;
						}
						if (State == 1) {
							break;
						}
						// 刻蚀结束 下拉第一个继电器（接ADC） 下拉第二个继电器（断电）
						HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_SET);
						HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_SET);
						HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_RESET);
						HAL_Delay(500);
						HAL_GPIO_WritePin(LK1_NEG_GPIO_Port, LK1_NEG_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK1_POS_GPIO_Port, LK1_POS_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_NEG_GPIO_Port, LK2_NEG_Pin, GPIO_PIN_RESET);
						HAL_GPIO_WritePin(LK2_POS_GPIO_Port, LK2_POS_Pin, GPIO_PIN_RESET);
						printf("page1.n3.val=%d\xff\xff\xff",Pulse_Cnt_Tim3);
						// 刻蚀结束 升降台下降到原来的位置
						uint32_t up_time = Pulse_Cnt_Tim3 * 10;
						HAL_GPIO_WritePin(MOTOR1_IN_DIR_GPIO_Port, MOTOR1_IN_DIR_Pin, GPIO_PIN_SET); // 向下
						HAL_TIM_PWM_Start(&htim3,TIM_CHANNEL_1);
						HAL_Delay(up_time);
						HAL_TIM_PWM_Stop(&htim3,TIM_CHANNEL_1);
						isPowered = 0;
						printf("page1.n4.val=%d\xff\xff\xff",isPowered);
						//下降到原来的位置 旋转 最后一根不旋转
						if ((Twins == 1 && i % 2 != 0 ) || (Twins == 0 && i < (echingcounts - 1))){
								HAL_GPIO_WritePin(MOTOR2_IN_DIR_GPIO_Port, MOTOR2_IN_DIR_Pin, GPIO_PIN_RESET); //
								HAL_TIM_PWM_Start(&htim2,TIM_CHANNEL_1);
							if (scan % 3 != 0){
								HAL_Delay(Pluse_Tim2_one * Pulse_Cnt_Tim2_33);
								scan++;
							}else{
								HAL_Delay(Pluse_Tim2_one * Pulse_Cnt_Tim2_34);
								scan=1;
							}
								HAL_TIM_PWM_Stop(&htim2,TIM_CHANNEL_1);
						}
						Tim2Flags = 0;
						Pulse_Cnt_Tim3 = 0;
						State = 0;
				}
				State = 0;
				Flags = 0;
				printf("page1.n4.val=%d\xff\xff\xff",100);
		}else if (Flags == 9){
				if (light == 20) HAL_TIM_PWM_Start(&htim5,TIM_CHANNEL_4);
				else __HAL_TIM_SetCompare(&htim5, TIM_CHANNEL_4, light);    //修改比较值，修改占空比
		}else if (Flags == 10){
				if (light == 0) HAL_TIM_PWM_Stop(&htim5,TIM_CHANNEL_4);
				else  __HAL_TIM_SetCompare(&htim5, TIM_CHANNEL_4, light);    //修改比较值，修改占空比
		}
  }
  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};
  RCC_PeriphCLKInitTypeDef PeriphClkInit = {0};

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSE;
  RCC_OscInitStruct.HSEState = RCC_HSE_ON;
  RCC_OscInitStruct.HSEPredivValue = RCC_HSE_PREDIV_DIV1;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;
  RCC_OscInitStruct.PLL.PLLMUL = RCC_PLL_MUL9;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_2) != HAL_OK)
  {
    Error_Handler();
  }
  PeriphClkInit.PeriphClockSelection = RCC_PERIPHCLK_ADC;
  PeriphClkInit.AdcClockSelection = RCC_ADCPCLK2_DIV8;
  if (HAL_RCCEx_PeriphCLKConfig(&PeriphClkInit) != HAL_OK)
  {
    Error_Handler();
  }
}

/* USER CODE BEGIN 4 */
// 电机脉冲时间计算 - 距离(mm)->脉冲时间(ms)
uint32_t CalPulseTime(uint32_t distance)
{
 uint32_t PulseTime = 10; // 计算每个脉冲的时间，单位ms
 uint32_t PWM_PR = 400; // 计算多少个脉冲旋转1圈，1圈1mm
 uint32_t pwm = (distance * PWM_PR) / 1000; // 计算多少个脉冲旋转distance距离
 uint32_t pwm_time = pwm * PulseTime; // 计算旋转distance距离的全部脉冲需要多少时间，单位ms
 return pwm_time;
}	


int fputc(int ch, FILE *f)
{
	while(HAL_UART_Transmit(&huart1, (uint8_t *)&ch, 1, 3000) != HAL_OK);
	return ch;
}

int fgetc(FILE *f)
{
	volatile char c = 0;
	while(HAL_UART_Receive(&huart1, (uint8_t *)&c, 1, 3000) != HAL_OK);
	return c;
}


/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}

#ifdef  USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
