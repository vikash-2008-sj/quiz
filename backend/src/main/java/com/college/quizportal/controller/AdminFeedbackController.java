package com.college.quizportal.controller;

import com.college.quizportal.dto.FeedbackDtos.*;
import com.college.quizportal.model.FeedbackStatus;
import com.college.quizportal.model.User;
import com.college.quizportal.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Strictly ADMIN-only anonymous feedback management.
 * Staff accounts are denied access (403 Forbidden) at both URL and method security layers.
 */
@RestController
@RequestMapping("/api/admin/feedback")
@PreAuthorize("hasRole('ADMIN')")
public class AdminFeedbackController {

    private final FeedbackService feedbackService;

    public AdminFeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @GetMapping
    public ResponseEntity<AdminFeedbackListResponse> listFeedback(
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) FeedbackStatus status,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(feedbackService.listAdminFeedback(categoryId, status, fromDate, toDate, keyword));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<AdminFeedbackDto> updateFeedback(@PathVariable Long id,
                                                           @Valid @RequestBody UpdateFeedbackStatusRequest request,
                                                           @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(feedbackService.updateFeedbackStatus(id, request, user));
    }
}
