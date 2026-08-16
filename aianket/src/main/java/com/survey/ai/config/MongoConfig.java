package com.survey.ai.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.mapping.event.ValidatingMongoEventListener;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

/**
 * MongoDB yapılandırma sınıfı.
 * MongoDB için tarih/zaman izleme özelliğini ve doğrulama özelliklerini etkinleştirir.
 */
@Configuration
@EnableMongoAuditing
public class MongoConfig {

    /**
     * MongoDB varlık doğrulama dinleyicisi.
     * Jakarta Bean Validation API'sini kullanarak MongoDB varlıklarını otomatik olarak doğrular.
     *
     * @param validator Bean doğrulayıcı
     * @return MongoDB olay dinleyicisi
     */
    @Bean
    public ValidatingMongoEventListener validatingMongoEventListener(LocalValidatorFactoryBean validator) {
        return new ValidatingMongoEventListener(validator);
    }

    /**
     * Bean doğrulama fabrikası.
     *
     * @return Bean doğrulayıcı
     */
    @Bean
    public LocalValidatorFactoryBean validator() {
        return new LocalValidatorFactoryBean();
    }
}

