package com.survey.ai.controller;


import com.survey.ai.entity.Role;
import com.survey.ai.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Rol yönetimi için API endpoint'leri.
 * Sadece ADMIN yetkisine sahip kullanıcılar tarafından erişilebilir.
 */
@RestController
@RequestMapping("/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    /**
     * Tüm rolleri getirir
     *
     * @return Rol listesi
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<Role>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    /**
     * ID'ye göre rol getirir
     *
     * @param id Rol ID
     * @return Bulunan rol
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Role> getRoleById(@PathVariable String id) {
        return ResponseEntity.ok(roleService.getRoleById(id));
    }

    /**
     * Ada göre rol getirir
     *
     * @param name Rol adı
     * @return Bulunan rol
     */
    @GetMapping("/name/{name}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Role> getRoleByName(@PathVariable String name) {
        return ResponseEntity.ok(roleService.getRoleByName(name));
    }

    /**
     * Yeni rol oluşturur
     *
     * @param role Oluşturulacak rol
     * @return Oluşturulan rol
     */
    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Role> createRole(@RequestBody Role role) {
        return new ResponseEntity<>(roleService.createRole(role), HttpStatus.CREATED);
    }

    /**
     * Var olan bir rolü günceller
     *
     * @param id Güncellenecek rolün ID'si
     * @param roleDetails Güncellenecek rol bilgileri
     * @return Güncellenen rol
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Role> updateRole(@PathVariable String id, @RequestBody Role roleDetails) {
        return ResponseEntity.ok(roleService.updateRole(id, roleDetails));
    }

    /**
     * Rol siler
     *
     * @param id Silinecek rolün ID'si
     * @return Boş yanıt
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> deleteRole(@PathVariable String id) {
        roleService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Belirlenen yetki seviyesinden daha yüksek veya eşit yetkiye sahip rolleri getirir
     *
     * @param level Minimum yetki seviyesi
     * @return Belirtilen yetki seviyesinden daha yüksek veya eşit yetkiye sahip roller
     */
    @GetMapping("/authority-level/{level}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<Role>> getRolesByAuthorityLevel(@PathVariable Integer level) {
        return ResponseEntity.ok(roleService.getRolesByAuthorityLevel(level));
    }
}
