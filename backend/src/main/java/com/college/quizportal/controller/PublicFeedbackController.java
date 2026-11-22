package com.college.quizportal.controller;

import com.college.quizportal.dto.FeedbackDtos.*;
import com.college.quizportal.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public anonymous student feedback endpoints.
 * Requires NO authentication and inspects NO user identity, cookies, or IP address.
 */
@RestController
@RequestMapping("/api/public/feedback")
public class PublicFeedbackController {

    private final FeedbackService feedbackService;

    public PublicFeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @GetMapping("/categories")
    public ResponseEntity<List<FeedbackCategoryDto>> listCategories() {
        return ResponseEntity.ok(feedbackService.listActiveCategories());
    }

    @PostMapping
    public ResponseEntity<FeedbackSubmissionConfirmationDto> submitFeedback(
        @Valid @RequestBody SubmitFeedbackRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(feedbackService.submitAnonymousFeedback(request));
    }
}
