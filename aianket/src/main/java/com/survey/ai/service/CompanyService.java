package com.survey.ai.service;

import com.survey.ai.entity.Company;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CompanyService {

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private SecurityService securityService;

    @Autowired
    private AuditService auditService;

    /**
     * Aktif şirketler. Site admini hepsini görür; şirket kullanıcısı yalnızca
     * kendi şirketini - aksi halde sistemdeki tüm firmalar listelenebiliyordu.
     */
    public List<Company> getAllActiveCompanies() {
        if (securityService.isCurrentUserAdmin()) {
            return companyRepository.findByStatus("ACTIVE");
        }

        String companyId = securityService.getCurrentUserCompanyId();
        if (companyId == null) {
            return List.of();
        }
        return companyRepository.findById(companyId)
                .filter(company -> "ACTIVE".equalsIgnoreCase(company.getStatus()))
                .map(List::of)
                .orElseGet(List::of);
    }

    /**
     * ID'ye göre restoran bilgilerini getirir
     */
    public Company getCompanyById(String id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Şirket", "id", id));
    }

    /**
     * Yeni restoran kaydeder
     */
    public Company saveCompany(Company company) {
        company.setCreatedAt(LocalDateTime.now());
        company.setUpdatedAt(LocalDateTime.now());
        return companyRepository.save(company);
    }

    /**
     * Restoran bilgilerini günceller
     */
    public Company updateCompany(String id, Company companyDetails) {
        checkOwnership(id);
        Company company = getCompanyById(id);

        // Süper admin işlem kayıtlarında görünsün diye ne değiştiği önce çıkarılır.
        String changes = AuditService.describe(
                AuditService.change("ad", company.getName(), companyDetails.getName()),
                AuditService.change("adres", company.getAddress(), companyDetails.getAddress()),
                AuditService.change("telefon", company.getPhone(), companyDetails.getPhone()),
                AuditService.change("e-posta", company.getEmail(), companyDetails.getEmail()),
                AuditService.change("logo", company.getLogoUrl(), companyDetails.getLogoUrl()),
                AuditService.change("açıklama", company.getDescription(), companyDetails.getDescription()),
                companyDetails.getWebsite() == null ? null
                        : AuditService.change("web sitesi", company.getWebsite(), companyDetails.getWebsite()));

        // Bilgileri güncelle
        company.setName(companyDetails.getName());
        company.setAddress(companyDetails.getAddress());
        company.setPhone(companyDetails.getPhone());
        company.setEmail(companyDetails.getEmail());
        company.setLogoUrl(companyDetails.getLogoUrl());
        company.setDescription(companyDetails.getDescription());

        // "Şirketim" ekranından gelen ek alanlar. Gönderilmeyen alan silinmesin:
        // eski istemciler bu alanları hiç göndermiyor.
        if (companyDetails.getWebsite() != null) {
            company.setWebsite(companyDetails.getWebsite());
        }
        if (companyDetails.getCoverImageUrl() != null) {
            company.setCoverImageUrl(companyDetails.getCoverImageUrl());
        }

        // Durum burada ACTIVE'e çekilmez: süper adminin dondurduğu şirket, sahibi
        // "Şirketim" ekranından bir alan kaydedince kendini çözüyor olurdu.
        if (company.getStatus() == null) {
            company.setStatus("ACTIVE");
        }
        company.setUpdatedAt(LocalDateTime.now());

        Company saved = companyRepository.save(company);
        if (changes != null) {
            auditService.record(AuditService.COMPANY_UPDATED, saved.getName(), changes);
        }
        return saved;
    }

    /**
     * Restoranı devre dışı bırakır (silmez)
     */
    public void deactivateCompany(String id) {
        checkOwnership(id);
        Company company = getCompanyById(id);
        company.setStatus("INACTIVE");
        company.setUpdatedAt(LocalDateTime.now());
        companyRepository.save(company);
        auditService.record(AuditService.COMPANY_UPDATED, company.getName(), "şirket pasife alındı");
    }

    /**
     * Şirket bilgilerini yalnızca o şirketin sahibi (ve site admini) değiştirebilir.
     * Editör/paylaşan rolündeki çalışanlar ve oturumsuz istekler geçemez.
     */
    private void checkOwnership(String companyId) {
        if (securityService.isCurrentUserAdmin()) {
            return;
        }
        if (!securityService.isCurrentUserCompanyOwner()
                || !companyId.equals(securityService.getCurrentUserCompanyId())) {
            throw new AccessDeniedException("Şirket bilgilerini yalnızca şirket sahibi güncelleyebilir");
        }
    }
}

