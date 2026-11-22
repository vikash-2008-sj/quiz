package com.college.quizportal.controller;

import com.college.quizportal.dto.QuizDtos.*;
import com.college.quizportal.model.QuizStatus;
import com.college.quizportal.model.User;
import com.college.quizportal.service.QuizService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminQuizController {

    private final QuizService quizService;

    public AdminQuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @GetMapping("/quizzes")
    public ResponseEntity<List<AdminQuizSummaryDto>> listQuizzes(
        @RequestParam(required = false) QuizStatus status,
        @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(quizService.listQuizzes(status, search));
    }

    @GetMapping("/quizzes/{id}")
    public ResponseEntity<AdminQuizDetailDto> getQuiz(@PathVariable Long id) {
        return ResponseEntity.ok(quizService.getQuizDetail(id));
    }

    @PostMapping("/quizzes")
    public ResponseEntity<AdminQuizDetailDto> createQuiz(@Valid @RequestBody CreateQuizRequest request,
                                                         @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.createQuiz(request, user));
    }

    @PutMapping("/quizzes/{id}")
    public ResponseEntity<AdminQuizDetailDto> updateQuiz(@PathVariable Long id,
                                                         @Valid @RequestBody UpdateQuizRequest request,
                                                         @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(quizService.updateQuiz(id, request, user));
    }

    @PatchMapping("/quizzes/{id}/status")
    public ResponseEntity<AdminQuizDetailDto> updateQuizStatus(@PathVariable Long id,
                                                               @Valid @RequestBody UpdateQuizStatusRequest request,
                                                               @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(quizService.updateQuizStatus(id, request.status(), user));
    }

    @DeleteMapping("/quizzes/{id}")
    public ResponseEntity<Map<String, String>> deleteQuiz(@PathVariable Long id,
                                                          @AuthenticationPrincipal User user) {
        quizService.deleteQuiz(id, user);
        return ResponseEntity.ok(Map.of("message", "Quiz deleted successfully"));
    }

    @PostMapping("/quizzes/{quizId}/questions")
    public ResponseEntity<AdminQuestionDto> addQuestion(@PathVariable Long quizId,
                                                        @Valid @RequestBody QuestionUpsertRequest request,
                                                        @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.addQuestion(quizId, request, user));
    }

    @PutMapping("/questions/{questionId}")
    public ResponseEntity<AdminQuestionDto> updateQuestion(@PathVariable Long questionId,
                                                           @Valid @RequestBody QuestionUpsertRequest request,
                                                           @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(quizService.updateQuestion(questionId, request, user));
    }

    @PatchMapping("/questions/{questionId}/status")
    public ResponseEntity<AdminQuestionDto> updateQuestionStatus(@PathVariable Long questionId,
                                                                 @Valid @RequestBody UpdateQuestionStatusRequest request,
                                                                 @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(quizService.updateQuestionStatus(questionId, request.status(), user));
    }

    @DeleteMapping("/questions/{questionId}")
    public ResponseEntity<Map<String, String>> deleteQuestion(@PathVariable Long questionId,
                                                              @AuthenticationPrincipal User user) {
        quizService.deleteQuestion(questionId, user);
        return ResponseEntity.ok(Map.of("message", "Question deleted successfully"));
    }
}
