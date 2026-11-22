package com.college.quizportal.controller;

import com.college.quizportal.dto.AnalyticsDtos.*;
import com.college.quizportal.model.RoleName;
import com.college.quizportal.model.User;
import com.college.quizportal.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Strictly aggregate quiz analytics endpoints.
 * Never returns individual student answers or identities.
 */
@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminAnalyticsController {

    private final AnalyticsService analyticsService;

    public AdminAnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    public ResponseEntity<DashboardOverviewDto> overview(@AuthenticationPrincipal User user) {
        boolean isAdmin = user != null && user.getRole().getName() == RoleName.ADMIN;
        return ResponseEntity.ok(analyticsService.getDashboardOverview(isAdmin));
    }

    @GetMapping("/quizzes/{quizId}")
    public ResponseEntity<QuizAnalyticsDto> quizAnalytics(@PathVariable Long quizId) {
        return ResponseEntity.ok(analyticsService.getQuizAnalytics(quizId));
    }

    @GetMapping("/questions/{questionId}")
    public ResponseEntity<QuestionAnalyticsDto> questionAnalytics(@PathVariable Long questionId) {
        return ResponseEntity.ok(analyticsService.getQuestionAnalytics(questionId));
    }
}
