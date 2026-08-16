package com.survey.ai.entity;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "question_definitions")
public class QuestionDefinition {

    @Id
    private String id;

    @NotBlank
    private String questionText;

    private String category; // Örneğin: "hizmet", "temizlik", "yemek" gibi

    private Integer displayOrder; // Görüntüleme sırası

    private boolean active = true; // Soru aktif mi?
}