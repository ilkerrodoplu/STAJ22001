package com.survey.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Masa başında gösterilen özet: yalnızca olumlu/olumsuz sayıları.
 * Yorum, puan ve müşteri bilgisi bilinçli olarak yer almaz - ayrıntı
 * yalnızca tüm şirket toplu incelendiğinde (raporlar) görünür.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TableSentimentSummary {

    private String tableNumber;
    private long positive;
    private long negative;
    private long total;
}
