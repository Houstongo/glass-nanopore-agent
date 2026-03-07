#include "usartCallback.h"

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
    if(huart->Instance == USART1)
    {
        if (RxBuf[0] == 0xFF && RxBuf[7] == 0xFF){
            if (RxBuf[4] == 0x00){
                Flags = 16;
                echinglength = ((uint16_t)RxBuf[2] << 8) | RxBuf[1];
                echingtime = (uint16_t) RxBuf[3];
                echingcounts = (uint16_t) RxBuf[5];
            }
            else if (RxBuf[6] == 0x0B) {State = 1;}
            else if (RxBuf[6] == 0x0C) {State = 2;}
            else if (RxBuf[6] == 0x0D) {Twins = 0;}
            else if (RxBuf[6] == 0x0E) {Twins = 1;}
            else if (RxBuf[6] == 0x01) {Flags = 1;}
            else if (RxBuf[6] == 0x02) {Flags = 2;}
            else if (RxBuf[6] == 0x03) {Flags = 3;}
            else if (RxBuf[6] == 0x04) {AC_DC = 0;}
            else if (RxBuf[6] == 0x05) {Flags = 5;}
            else if (RxBuf[6] == 0x06) {Flags = 6;}
            else if (RxBuf[6] == 0x07) {Flags = 7;}
            else if (RxBuf[6] == 0x08) {AC_DC = 1;}
            else if (RxBuf[6] == 0x09){
                Flags = 9;
            if (light != 100) light += 20;
            }
            else if (RxBuf[6] == 0x0A){
                Flags = 10;
            if (light != 0) light -= 20;
            }
        }
        HAL_UART_Receive_DMA(&huart1, RxBuf, 8);
    }
}
