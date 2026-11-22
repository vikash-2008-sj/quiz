package com.college.quizportal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * Public student-facing DTOs.
 * IMPORTANT SECURITY INVARIANT:
 * PublicOptionDto and PublicQuestionDto intentionally exclude `correct` and `explanation`
 * so correct answers can NEVER be serialized before server-side submission.
 */
public final class PublicQuizDtos {

    private PublicQuizDtos() {}

    public record PublicOptionDto(
        Long id,
        String optionLabel,
        String optionText,
        int orderIndex
    ) {}

    public record PublicQuestionDto(
        Long id,
        String publicCode,
        Long quizId,
        String quizPublicCode,
        String quizTitle,
        String courseCode,
        String department,
        String questionText,
        String status,
        String quizStatus,
        int orderIndex,
        boolean alreadySubmitted,
        List<PublicOptionDto> options
    ) {}

    public record PublicQuizDto(
        Long id,
        String publicCode,
        String title,
        String description,
        String courseCode,
        String department,
        String status,
        List<PublicQuestionDto> questions
    ) {}

    public record IssueTokenRequest(
        @NotBlank(message = "Question public code is required")
        @Size(max = 32)
        String questionPublicCode
    ) {}

    public record IssueTokenResponse(
        String submissionToken,
        boolean alreadySubmitted,
        Instant expiresAt
    ) {}

    public record SubmitAnswerRequest(
        @NotNull(message = "Selected option is required")
        Long selectedOptionId,

        @NotBlank(message = "One-time submission token is required")
        @Size(min = 16, max = 128, message = "Invalid submission token")
        String submissionToken
    ) {}

    public record AnswerResultDto(
        Long questionId,
        String questionPublicCode,
        Long selectedOptionId,
        boolean correct,
        Long correctOptionId,
        String correctOptionLabel,
        String correctOptionText,
        String explanation,
        Instant submittedAt
    ) {}
}
