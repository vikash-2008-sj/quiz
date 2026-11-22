package com.college.quizportal.repository;

import com.college.quizportal.model.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {
    List<QuestionOption> findByQuestionIdOrderByOrderIndexAscIdAsc(Long questionId);
    Optional<QuestionOption> findByIdAndQuestionId(Long id, Long questionId);
}
