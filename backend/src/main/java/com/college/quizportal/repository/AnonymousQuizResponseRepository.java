package com.college.quizportal.repository;

import com.college.quizportal.model.AnonymousQuizResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Provides aggregate analytics queries only; individual responses are never exposed to admin endpoints.
 */
public interface AnonymousQuizResponseRepository extends JpaRepository<AnonymousQuizResponse, Long> {

    boolean existsByQuestionIdAndTokenHash(Long questionId, String tokenHash);

    long countByQuizId(Long quizId);

    long countByQuizIdAndCorrectTrue(Long quizId);

    long countByQuestionId(Long questionId);

    long countByQuestionIdAndCorrectTrue(Long questionId);

    long countByCorrectTrue();

    @Query("SELECT r.selectedOption.id, COUNT(r) FROM AnonymousQuizResponse r " +
           "WHERE r.question.id = :questionId GROUP BY r.selectedOption.id")
    List<Object[]> countGroupedByOptionForQuestion(@Param("questionId") Long questionId);

    @Query("SELECT r.question.id, r.selectedOption.id, COUNT(r) FROM AnonymousQuizResponse r " +
           "WHERE r.quiz.id = :quizId GROUP BY r.question.id, r.selectedOption.id")
    List<Object[]> countGroupedByQuestionAndOptionForQuiz(@Param("quizId") Long quizId);

    @Query("SELECT r.quiz.id, COUNT(r), SUM(CASE WHEN r.correct = true THEN 1 ELSE 0 END) " +
           "FROM AnonymousQuizResponse r GROUP BY r.quiz.id")
    List<Object[]> countTotalsAndCorrectGroupedByQuiz();
}
