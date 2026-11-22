package com.college.quizportal.dto;

import com.college.quizportal.model.FeedbackStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class FeedbackDtos {

    private FeedbackDtos() {}

    public record FeedbackCategoryDto(
        Long id,
        String name,
        String slug,
        String description
    ) {}

    public record SubmitFeedbackRequest(
        @NotNull(message = "Please select a feedback category")
        Long categoryId,

        @Size(max = 200, message = "Subject must not exceed 200 characters")
        String subject,

        @NotBlank(message = "Feedback message is required")
        @Size(min = 10, max = 4000, message = "Feedback message must be between 10 and 4000 characters")
        String message
    ) {}

    public record FeedbackSubmissionConfirmationDto(
        String categoryName,
        Instant submittedAt,
        String message
    ) {}

    public record AdminFeedbackDto(
        Long id,
        Long categoryId,
        String categoryName,
        String subject,
        String message,
        FeedbackStatus status,
        String adminNotes,
        Instant createdAt,
        Instant updatedAt,
        Instant reviewedAt
    ) {}

    public record UpdateFeedbackStatusRequest(
        @NotNull(message = "Status is required")
        FeedbackStatus status,

        @Size(max = 2000, message = "Admin notes must not exceed 2000 characters")
        String adminNotes
    ) {}

    public record FeedbackSummaryStatsDto(
        long total,
        long newCount,
        long reviewedCount,
        long resolvedCount
    ) {}

    public record AdminFeedbackListResponse(
        FeedbackSummaryStatsDto stats,
        List<AdminFeedbackDto> items
    ) {}
}
