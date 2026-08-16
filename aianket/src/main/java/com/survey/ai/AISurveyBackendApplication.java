package com.survey.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
// EmailService'teki @Async'ler bu olmadan proxy'lenmez ve SMTP beklemesi
// (3x5 sn timeout) doğrudan HTTP isteğinin üstüne biner.
@EnableAsync
public class AISurveyBackendApplication {

    public static void main(String[] args) {
        // Bildirim/anket zamanları LocalDateTime; bunlar JSON'a saat dilimi
        // bilgisi olmadan yazılır ve tarayıcı onları kendi diliminde okur.
        // Sunucu UTC çalıştığında panelde her kayıt 3 saat eski görünüyordu.
        // spring.jackson.time-zone yalnızca java.util.Date için geçerli, bu
        // yüzden JVM'in kendi dilimini ayarlıyoruz.
        TimeZone.setDefault(TimeZone.getTimeZone("Europe/Istanbul"));
        SpringApplication.run(AISurveyBackendApplication.class, args);
    }

}
