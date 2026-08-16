package com.survey.ai.entity;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SurveyQuestion {
    @Id
    private String id;
    private String text;
    private String category;
    private Integer displayOrder;
    private String type;
    private Boolean required = true;

    /** Yalnızca MULTIPLE_CHOICE sorularda dolu: seçenek metinleri. */
    private java.util.List<String> options;

    public SurveyQuestion(String id, String text, Integer displayOrder, String type, Boolean required) {
        this.id = id;
        this.text = text;
        this.displayOrder = displayOrder;
        this.type = type;
        this.required = required;
    }

    // ID için yardımcı metot
    public String getId() {
        if (this.id == null || this.id.isEmpty()) {
            this.id = java.util.UUID.randomUUID().toString();
        }
        return id;
    }


}

