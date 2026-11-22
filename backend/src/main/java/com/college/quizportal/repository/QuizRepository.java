package com.college.quizportal.repository;

import com.college.quizportal.model.Quiz;
import com.college.quizportal.model.QuizStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    Optional<Quiz> findByPublicCode(String publicCode);
    boolean existsByPublicCode(String publicCode);
    List<Quiz> findAllByOrderByCreatedAtDesc();
    List<Quiz> findByStatusOrderByCreatedAtDesc(QuizStatus status);
    long countByStatus(QuizStatus status);
}
