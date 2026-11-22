package com.college.quizportal.repository;

import com.college.quizportal.model.FeedbackCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FeedbackCategoryRepository extends JpaRepository<FeedbackCategory, Long> {
    List<FeedbackCategory> findByActiveTrueOrderByNameAsc();
    Optional<FeedbackCategory> findBySlug(String slug);
}
