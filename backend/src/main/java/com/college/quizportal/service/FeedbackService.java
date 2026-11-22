package com.college.quizportal.service;

import com.college.quizportal.dto.FeedbackDtos.*;
import com.college.quizportal.model.*;
import com.college.quizportal.repository.FeedbackCategoryRepository;
import com.college.quizportal.repository.FeedbackRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final FeedbackCategoryRepository categoryRepository;
    private final SettingsService settingsService;
    private final InputSanitizer sanitizer;
    private final AuditLogService auditLogService;

    public FeedbackService(FeedbackRepository feedbackRepository,
                           FeedbackCategoryRepository categoryRepository,
                           SettingsService settingsService,
                           InputSanitizer sanitizer,
                           AuditLogService auditLogService) {
        this.feedbackRepository = feedbackRepository;
        this.categoryRepository = categoryRepository;
        this.settingsService = settingsService;
        this.sanitizer = sanitizer;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<FeedbackCategoryDto> listActiveCategories() {
        return categoryRepository.findByActiveTrueOrderByNameAsc().stream()
            .map(c -> new FeedbackCategoryDto(c.getId(), c.getName(), c.getSlug(), c.getDescription()))
            .toList();
    }

    /**
     * Submits strictly anonymous feedback.
     * Deliberately accepts NO authentication context, NO user object, NO IP address, and NO headers.
     */
    @Transactional
    public FeedbackSubmissionConfirmationDto submitAnonymousFeedback(SubmitFeedbackRequest request) {
        if (!settingsService.getOrCreateSettings().isAllowAnonymousFeedback()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Anonymous feedback submissions are currently paused by the college administration.");
        }

        FeedbackCategory category = categoryRepository.findById(request.categoryId())
            .filter(FeedbackCategory::isActive)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected feedback category is invalid"));

        String cleanMessage = sanitizer.sanitizeRequiredText(request.message());
        if (cleanMessage.length() < 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Feedback message must contain at least 10 readable characters");
        }

        Feedback feedback = new Feedback();
        feedback.setCategory(category);
        feedback.setSubject(sanitizer.sanitizePlainText(request.subject()));
        feedback.setMessage(cleanMessage);
        feedback.setStatus(FeedbackStatus.NEW);

        Feedback saved = feedbackRepository.save(feedback);

        // Notice: We do NOT return the internal DB ID or any trackable identifier that could deanonymize later.
        return new FeedbackSubmissionConfirmationDto(
            category.getName(),
            saved.getCreatedAt(),
            "Your anonymous feedback has been recorded without any identifying student data."
        );
    }

    @Transactional(readOnly = true)
    public AdminFeedbackListResponse listAdminFeedback(Long categoryId,
                                                       FeedbackStatus status,
                                                       LocalDate fromDate,
                                                       LocalDate toDate,
                                                       String keyword) {
        Specification<Feedback> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (fromDate != null) {
                Instant start = fromDate.atStartOfDay().toInstant(ZoneOffset.UTC);
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
            }
            if (toDate != null) {
                Instant endExclusive = toDate.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
                predicates.add(cb.lessThan(root.get("createdAt"), endExclusive));
            }
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate subjectMatch = cb.like(cb.lower(cb.coalesce(root.get("subject"), "")), pattern);
                Predicate messageMatch = cb.like(cb.lower(root.get("message")), pattern);
                predicates.add(cb.or(subjectMatch, messageMatch));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<AdminFeedbackDto> items = feedbackRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
            .stream()
            .map(this::toAdminDto)
            .toList();

        FeedbackSummaryStatsDto stats = new FeedbackSummaryStatsDto(
            feedbackRepository.count(),
            feedbackRepository.countByStatus(FeedbackStatus.NEW),
            feedbackRepository.countByStatus(FeedbackStatus.REVIEWED),
            feedbackRepository.countByStatus(FeedbackStatus.RESOLVED)
        );

        return new AdminFeedbackListResponse(stats, items);
    }

    @Transactional
    public AdminFeedbackDto updateFeedbackStatus(Long feedbackId, UpdateFeedbackStatusRequest request, User actor) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback record not found"));

        feedback.setStatus(request.status());
        feedback.setAdminNotes(sanitizer.sanitizePlainText(request.adminNotes()));
        if (request.status() == FeedbackStatus.REVIEWED || request.status() == FeedbackStatus.RESOLVED) {
            feedback.setReviewedAt(Instant.now());
        } else {
            feedback.setReviewedAt(null);
        }

        Feedback saved = feedbackRepository.save(feedback);
        auditLogService.record(actor, "FEEDBACK_STATUS_UPDATED", "FEEDBACK", String.valueOf(saved.getId()),
            "Marked feedback #" + saved.getId() + " (" + saved.getCategory().getName() + ") as " + saved.getStatus());

        return toAdminDto(saved);
    }

    private AdminFeedbackDto toAdminDto(Feedback f) {
        return new AdminFeedbackDto(
            f.getId(),
            f.getCategory().getId(),
            f.getCategory().getName(),
            f.getSubject(),
            f.getMessage(),
            f.getStatus(),
            f.getAdminNotes(),
            f.getCreatedAt(),
            f.getUpdatedAt(),
            f.getReviewedAt()
        );
    }
}
