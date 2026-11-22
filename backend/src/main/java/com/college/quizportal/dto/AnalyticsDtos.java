package com.college.quizportal.dto;

import java.util.List;

/**
 * Aggregate-only analytics DTOs.
 * Never includes individual student responses, identities, emails, roll numbers, or token hashes.
 */
public final class AnalyticsDtos {

    private AnalyticsDtos() {}

    public record OptionStatDto(
        Long optionId,
        String optionLabel,
        String optionText,
        boolean correct,
        long responseCount,
        double percentage
    ) {}

    public record QuestionAnalyticsDto(
        Long questionId,
        String publicCode,
        String questionText,
        String status,
        int orderIndex,
        long totalSubmissions,
        long correctCount,
        long incorrectCount,
        double accuracyPercentage,
        List<OptionStatDto> optionStats
    ) {}

    public record QuizAnalyticsDto(
        Long quizId,
        String publicCode,
        String title,
        String courseCode,
        String department,
        String status,
        long totalQuestions,
        long totalSubmissions,
        long correctCount,
        long incorrectCount,
        double accuracyPercentage,
        List<QuestionAnalyticsDto> questionAnalytics
    ) {}

    public record QuizComparisonDto(
        Long quizId,
        String title,
        String courseCode,
        String status,
        long totalSubmissions,
        long correctCount,
        long incorrectCount,
        double accuracyPercentage
    ) {}

    public record CategoryCountDto(
        String category,
        long count
    ) {}

    public record DashboardOverviewDto(
        long totalQuizzes,
        long publishedQuizzes,
        long totalQuestions,
        long totalSubmissions,
        long totalCorrectSubmissions,
        long totalIncorrectSubmissions,
        double overallAccuracyPercentage,
        Long pendingFeedbackCount,
        Long totalFeedbackCount,
        List<QuizComparisonDto> quizComparisons,
        List<CategoryCountDto> feedbackByCategory
    ) {}
}
