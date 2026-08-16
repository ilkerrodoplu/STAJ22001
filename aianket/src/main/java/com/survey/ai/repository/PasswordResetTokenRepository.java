package com.survey.ai.repository;

import com.survey.ai.entity.*;
import com.survey.ai.entity.PasswordResetToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends MongoRepository<PasswordResetToken, String> {

    Optional<PasswordResetToken> findByToken(String token);

    @Query(value = "{ 'userId' : ?0 }", delete = true)
    void deleteByUserId(String userId);
}
