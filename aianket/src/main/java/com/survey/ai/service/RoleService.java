package com.survey.ai.service;


import com.survey.ai.entity.Role;
import com.survey.ai.enums.UserRole;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Rol yönetimi için servis sınıfı.
 * Rolleri oluşturma, güncelleme, silme ve sorgulama işlemlerini yönetir.
 */
@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;

    /**
     * Tüm rolleri getirir
     *
     * @return Rol listesi
     */
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    /**
     * ID'ye göre rol getirir
     *
     * @param id Rol ID
     * @return Bulunan rol
     * @throws ResourceNotFoundException Rol bulunamazsa fırlatılır
     */
    public Role getRoleById(String id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
    }

    /**
     * Ada göre rol getirir
     *
     * @param name Rol adı
     * @return Bulunan rol
     * @throws ResourceNotFoundException Rol bulunamazsa fırlatılır
     */
    public Role getRoleByName(String name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", name));
    }

    /**
     * Yeni rol oluşturur
     *
     * @param role Oluşturulacak rol
     * @return Oluşturulan rol
     * @throws ResourceNotFoundException Aynı isimde rol varsa fırlatılır
     */
    public Role createRole(Role role) {
        if (roleRepository.existsByName(role.getName())) {
            throw new ResourceNotFoundException("Role", "name", role.getName());
        }
        return roleRepository.save(role);
    }

    /**
     * Var olan bir rolü günceller
     *
     * @param id Güncellenecek rolün ID'si
     * @param roleDetails Güncellenecek rol bilgileri
     * @return Güncellenen rol
     * @throws ResourceNotFoundException Rol bulunamazsa fırlatılır
     */
    public Role updateRole(String id, Role roleDetails) {
        Role role = getRoleById(id);

        // Rol adı değiştiyse ve yeni ad zaten kullanımdaysa hata fırlat
        if (!role.getName().equals(roleDetails.getName()) &&
                roleRepository.existsByName(roleDetails.getName())) {
            throw new ResourceNotFoundException("Role", "name", roleDetails.getName());
        }

        role.setName(roleDetails.getName());
        role.setDescription(roleDetails.getDescription());
        role.setAuthorityLevel(roleDetails.getAuthorityLevel());
        role.setPermissions(roleDetails.getPermissions());

        return roleRepository.save(role);
    }

    /**
     * Rol siler
     *
     * @param id Silinecek rolün ID'si
     * @throws ResourceNotFoundException Rol bulunamazsa fırlatılır
     */
    public void deleteRole(String id) {
        Role role = getRoleById(id);
        roleRepository.delete(role);
    }

    /**
     * Belirlenen yetki seviyesinden daha yüksek veya eşit yetkiye sahip rolleri getirir
     *
     * @param authorityLevel Minimum yetki seviyesi
     * @return Belirtilen yetki seviyesinden daha yüksek veya eşit yetkiye sahip roller
     */
    public List<Role> getRolesByAuthorityLevel(Integer authorityLevel) {
        return roleRepository.findByAuthorityLevelGreaterThanEqual(authorityLevel);
    }

    /**
     * Varsayılan rolleri oluşturur (uygulama başlatıldığında çağrılabilir)
     */
    public void initializeDefaultRoles() {
        // Roller UserRole enum'undan üretilir; eksik olan varsa eklenir.
        for (UserRole userRole : UserRole.values()) {
            if (roleRepository.findByName(userRole.name()).isPresent()) {
                continue;
            }
            Role role = new Role();
            role.setName(userRole.name());
            role.setDescription(userRole.getDescription());
            role.setAuthorityLevel(userRole.getAuthorityLevel());
            role.setPermissions(userRole.getPermissions());
            roleRepository.save(role);
        }
    }
}

