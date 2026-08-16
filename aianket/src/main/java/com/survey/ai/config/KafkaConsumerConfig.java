package com.survey.ai.config;

import com.survey.ai.dto.SurveyResponseKafkaDto;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableKafka
public class KafkaConsumerConfig {

    @Bean
    public ConsumerFactory<String, SurveyResponseKafkaDto> consumerFactory() {
        // SurveyResponse yerine ihtiyacınıza göre tip sınıfını kullanın
        JsonDeserializer<SurveyResponseKafkaDto> deserializer = new JsonDeserializer<>(SurveyResponseKafkaDto.class);
        deserializer.addTrustedPackages("*");
        deserializer.setRemoveTypeHeaders(false); // Tip başlıklarını koruyun

        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        config.put(ConsumerConfig.GROUP_ID_CONFIG, "survey-response-group");
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, deserializer);

        return new DefaultKafkaConsumerFactory<>(config, new StringDeserializer(), deserializer);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, SurveyResponseKafkaDto> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, SurveyResponseKafkaDto> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        return factory;
    }
}
