package com.survey.ai.service;

import com.survey.ai.dto.ReadySurveyTemplateDto;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.ReadySurveyTemplate;
import com.survey.ai.enums.CompanyType;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.ReadySurveyTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReadySurveyTemplateService {

    private final ReadySurveyTemplateRepository repository;
    private final CompanyRepository companyRepository;

    /**
     * Bir şirketin anket oluşturma ekranında görebileceği hazır şablonlar:
     * kendi türüne özel olanlar + her şirkete açık olan genel ("GENEL") kalıp.
     * Şirketin türü tanımlı değilse (eski kayıtlar) yalnızca genel kalıp döner.
     */
    public List<ReadySurveyTemplateDto> getTemplatesForCompany(String companyId) {
        CompanyType type = companyRepository.findById(companyId)
                .map(Company::getCompanyType)
                .orElse(null);

        List<String> categories = new ArrayList<>();
        categories.add(CompanyType.GENERIC_CATEGORY);
        // OTHER da genel kalıbı kullanır, ayrı bir kategorisi yoktur.
        if (type != null && type != CompanyType.OTHER) {
            categories.add(type.name());
        }

        log.debug("Şirket {} için hazır şablonlar getiriliyor, kategoriler: {}", companyId, categories);
        return repository.findByCategoryInAndActiveTrue(categories).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Tüm aktif hazır şablonları getirir
     */
    public List<ReadySurveyTemplateDto> getAllActiveTemplates() {
        log.debug("Tüm aktif hazır şablonlar getiriliyor");
        List<ReadySurveyTemplate> templates = repository.findByActiveTrue();
        return templates.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Kategoriye göre aktif şablonları getirir
     */
    public List<ReadySurveyTemplateDto> getTemplatesByCategory(String category) {
        log.debug("Kategori bazında hazır şablonlar getiriliyor: {}", category);
        List<ReadySurveyTemplate> templates = repository.findByCategoryAndActiveTrue(category);
        return templates.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * ID'ye göre şablon getirir
     */
    public Optional<ReadySurveyTemplateDto> getTemplateById(String id) {
        log.debug("ID ile hazır şablon getiriliyor: {}", id);
        return repository.findById(id)
                .map(this::convertToDto);
    }

    /**
     * İsme göre şablon getirir
     */
    public Optional<ReadySurveyTemplateDto> getTemplateByName(String name) {
        log.debug("İsme göre hazır şablon getiriliyor: {}", name);
        return repository.findByNameAndActiveTrue(name)
                .map(this::convertToDto);
    }

    /**
     * Kategori bazında şablon sayısını döndürür
     */
    public long countTemplatesByCategory(String category) {
        return repository.countByCategory(category);
    }

    /**
     * Toplam aktif şablon sayısını döndürür
     */
    public long countActiveTemplates() {
        return repository.countByActiveTrue();
    }

    /**
     * Tüm kategorileri listeler
     */
    public List<String> getAllCategories() {
        return repository.findByActiveTrue()
                .stream()
                .map(ReadySurveyTemplate::getCategory)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    /**
     * Entity'yi DTO'ya çevirir
     */
    private ReadySurveyTemplateDto convertToDto(ReadySurveyTemplate entity) {
        ReadySurveyTemplateDto dto = new ReadySurveyTemplateDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setDescription(entity.getDescription());
        dto.setCategory(entity.getCategory());
        dto.setActive(entity.getActive());

        if (entity.getQuestions() != null) {
            List<ReadySurveyTemplateDto.ReadyQuestionDto> questionDtos = entity.getQuestions()
                    .stream()
                    .map(q -> new ReadySurveyTemplateDto.ReadyQuestionDto(
                            q.getText(),
                            q.getRequired(),
                            q.getType(),
                            q.getDisplayOrder(),
                            q.getOptions()
                    ))
                    .collect(Collectors.toList());
            dto.setQuestions(questionDtos);
        }

        return dto;
    }
}