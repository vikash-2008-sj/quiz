package com.college.quizportal.repository;

import com.college.quizportal.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    Optional<Question> findByPublicCode(String publicCode);
    boolean existsByPublicCode(String publicCode);
    List<Question> findByQuizIdOrderByOrderIndexAscIdAsc(Long quizId);

    @Query("SELECT DISTINCT q FROM Question q LEFT JOIN FETCH q.options JOIN FETCH q.quiz WHERE q.publicCode = :publicCode")
    Optional<Question> findByPublicCodeWithOptionsAndQuiz(@Param("publicCode") String publicCode);

    @Query("SELECT DISTINCT q FROM Question q LEFT JOIN FETCH q.options WHERE q.quiz.id = :quizId ORDER BY q.orderIndex ASC, q.id ASC")
    List<Question> findByQuizIdWithOptions(@Param("quizId") Long quizId);

    long countByQuizId(Long quizId);
}
