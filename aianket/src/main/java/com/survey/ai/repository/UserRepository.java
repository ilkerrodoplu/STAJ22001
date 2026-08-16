package com.survey.ai.repository;

import com.survey.ai.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);


    @Query("{ 'roles' : ?0 }")
    List<User> findByRole(String role);

    @Query("{ 'companyId' : ?0 }")
    List<User> findByCompanyId(String companyId);

    @Query("{ 'companyId' : ?0, 'roles' : ?1 }")
    List<User> findByCompanyIdAndRole(String companyId, String role);

    @Query("{ 'status' : ?0 }")
    Page<User> findByStatus(String status, Pageable pageable);

    @Query("{'$or': [{'name': {$regex: ?0, $options: 'i'}}, {'email': {$regex: ?0, $options: 'i'}}]}")
    Page<User> searchByNameOrEmail(String searchTerm, Pageable pageable);

    /** Kapatılmış ve belirtilen tarihten önce pasife alınmış hesaplar. */
    List<User> findByStatusAndDeactivatedAtBefore(String status, java.time.LocalDateTime before);
}
