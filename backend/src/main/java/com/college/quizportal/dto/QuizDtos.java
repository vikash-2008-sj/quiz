package com.college.quizportal.dto;

import com.college.quizportal.model.QuestionStatus;
import com.college.quizportal.model.QuizStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class QuizDtos {

    private QuizDtos() {}

    public record CreateQuizRequest(
        @NotBlank(message = "Quiz title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        String title,

        @Size(max = 2000, message = "Description must not exceed 2000 characters")
        String description,

        @Size(max = 60, message = "Course code must not exceed 60 characters")
        String courseCode,

        @Size(max = 120, message = "Department must not exceed 120 characters")
        String department,

        QuizStatus status,
        Instant startsAt,
        Instant endsAt
    ) {}

    public record UpdateQuizRequest(
        @NotBlank(message = "Quiz title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        String title,

        @Size(max = 2000, message = "Description must not exceed 2000 characters")
        String description,

        @Size(max = 60, message = "Course code must not exceed 60 characters")
        String courseCode,

        @Size(max = 120, message = "Department must not exceed 120 characters")
        String department,

        QuizStatus status,
        Instant startsAt,
        Instant endsAt
    ) {}

    public record UpdateQuizStatusRequest(
        @NotNull(message = "Status is required")
        QuizStatus status
    ) {}

    public record OptionInput(
        Long id,

        @Size(max = 10, message = "Option label must not exceed 10 characters")
        String optionLabel,

        @NotBlank(message = "Option text is required")
        @Size(max = 500, message = "Option text must not exceed 500 characters")
        String optionText,

        boolean correct
    ) {}

    public record QuestionUpsertRequest(
        @NotBlank(message = "Question text is required")
        @Size(max = 2000, message = "Question text must not exceed 2000 characters")
        String questionText,

        @Size(max = 2000, message = "Explanation must not exceed 2000 characters")
        String explanation,

        Integer orderIndex,

        QuestionStatus status,

        @NotEmpty(message = "At least 2 options are required")
        @Size(min = 2, max = 6, message = "Provide between 2 and 6 options")
        @Valid
        List<OptionInput> options
    ) {}

    public record UpdateQuestionStatusRequest(
        @NotNull(message = "Question status is required")
        QuestionStatus status
    ) {}

    public record AdminOptionDto(
        Long id,
        String optionLabel,
        String optionText,
        boolean correct,
        int orderIndex
    ) {}

    public record AdminQuestionDto(
        Long id,
        Long quizId,
        String publicCode,
        String shareUrl,
        String questionText,
        String explanation,
        int orderIndex,
        QuestionStatus status,
        long submissionCount,
        List<AdminOptionDto> options,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record AdminQuizSummaryDto(
        Long id,
        String publicCode,
        String shareUrl,
        String title,
        String description,
        String courseCode,
        String department,
        QuizStatus status,
        Instant startsAt,
        Instant endsAt,
        long questionCount,
        long totalSubmissions,
        double accuracyPercentage,
        String createdByName,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record AdminQuizDetailDto(
        Long id,
        String publicCode,
        String shareUrl,
        String title,
        String description,
        String courseCode,
        String department,
        QuizStatus status,
        Instant startsAt,
        Instant endsAt,
        long totalSubmissions,
        String createdByName,
        List<AdminQuestionDto> questions,
        Instant createdAt,
        Instant updatedAt
    ) {}
}
