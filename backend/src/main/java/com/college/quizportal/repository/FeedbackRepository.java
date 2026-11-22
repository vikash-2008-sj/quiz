package com.college.quizportal.repository;

import com.college.quizportal.model.Feedback;
import com.college.quizportal.model.FeedbackStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long>, JpaSpecificationExecutor<Feedback> {

    long countByStatus(FeedbackStatus status);

    @Query("SELECT f.category.name, COUNT(f) FROM Feedback f GROUP BY f.category.name ORDER BY COUNT(f) DESC")
    List<Object[]> countGroupedByCategory();
}
