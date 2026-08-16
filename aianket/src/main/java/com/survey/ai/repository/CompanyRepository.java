package com.survey.ai.repository;

import com.survey.ai.entity.Company;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepository extends MongoRepository<Company, String> {
    List<Company> findByStatus(String active);
    Optional<Company> findByName(String name);
    boolean existsByEmail(String email);
    boolean existsByName(String name);
    Optional<Company> findByid(String id);
    Optional<Company> findByEmailAndStatusEqualsIgnoreCase(String email,String status);
    Optional<Company> findByInviteCode(String inviteCode);

}
