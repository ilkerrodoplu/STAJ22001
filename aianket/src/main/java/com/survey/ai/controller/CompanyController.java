
package com.survey.ai.controller;

import com.survey.ai.dto.CompanyDto;
import com.survey.ai.dto.CompanyResponse;
import com.survey.ai.entity.Company;
import com.survey.ai.enums.CompanyType;
import com.survey.ai.service.AuthService;
import com.survey.ai.service.CompanyService;
import com.survey.ai.service.SecurityService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/company")
public class CompanyController {

    @Autowired
    private CompanyService companyService;

    @Autowired
    private AuthService authService;

    @Autowired
    private SecurityService securityService;

    /**
     * Şirketsiz kullanıcının kendi şirketini kurması: hesabı zaten var, yalnızca
     * şirket bilgileri istenir ve kurucu şirketin sahibi olur.
     */
    @PostMapping("/found")
    public ResponseEntity<CompanyResponse> foundCompany(Authentication authentication,
                                                        @Valid @RequestBody CompanyDto company) {
        return ResponseEntity.ok(authService.foundCompany(authentication.getName(), company));
    }

    @GetMapping
    public ResponseEntity<List<Company>> getAllActiveCompanies() {
        return ResponseEntity.ok(companyService.getAllActiveCompanies());
    }

    /** Kayıt formundaki "Şirket Türü" listesi - tek kaynak burasıdır. */
    @GetMapping("/types")
    public ResponseEntity<List<Map<String, String>>> getCompanyTypes() {
        return ResponseEntity.ok(
                Arrays.stream(CompanyType.values())
                        .map(type -> Map.of("value", type.name(), "label", type.getLabel()))
                        .toList()
        );
    }

    /**
     * Yol değişkeni {@code companyId} değil {@code id} olduğu için
     * CompanyScopeInterceptor bu uca hiç bakmıyor; kapsam kontrolü burada yapılır.
     * Kontrol yokken her şirket kullanıcısı istediği şirketin tam kaydını
     * (e-posta, telefon, adres) okuyabiliyordu.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Company> getCompanyById(@PathVariable String id) {
        securityService.requireOwnCompany(id);
        return ResponseEntity.ok(companyService.getCompanyById(id));
    }

    /**
     * Ham şirket kaydı; hiçbir yetki kontrolü yoktu, dolayısıyla en dar roldeki
     * çalışan bile (paylaşan/editör) sınırsız şirket kaydı açabiliyordu.
     * Kullanıcıların şirket kurma yolu {@code POST /v1/company/found}'dur;
     * burası yalnızca site admininde kalır.
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping
    public ResponseEntity<Company> createCompany(@RequestBody Company company) {
        return new ResponseEntity<>(companyService.saveCompany(company), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Company> updateCompany(@PathVariable String id, @RequestBody Company company) {
        return ResponseEntity.ok(companyService.updateCompany(id, company));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateCompany(@PathVariable String id) {
        companyService.deactivateCompany(id);
        return ResponseEntity.noContent().build();
    }
}
