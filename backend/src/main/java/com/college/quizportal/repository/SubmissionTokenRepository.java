package com.college.quizportal.repository;

import com.college.quizportal.model.SubmissionToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface SubmissionTokenRepository extends JpaRepository<SubmissionToken, Long> {

    Optional<SubmissionToken> findByTokenHashAndQuestionId(String tokenHash, Long questionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SubmissionToken t SET t.used = true, t.usedAt = :now " +
           "WHERE t.tokenHash = :tokenHash AND t.question.id = :questionId " +
           "AND t.used = false AND t.expiresAt > :now")
    int consumeToken(@Param("tokenHash") String tokenHash,
                     @Param("questionId") Long questionId,
                     @Param("now") Instant now);
}
