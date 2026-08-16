package com.survey.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaginatedCommentsResponse {
    private List<Map<String, Object>> content;
    private int totalPages;
    private long totalElements;
    private int currentPage;
    private int size;
    private boolean hasNext;
    private boolean hasPrevious;


}
