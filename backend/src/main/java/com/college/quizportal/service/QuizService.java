package com.college.quizportal.service;

import com.college.quizportal.dto.QuizDtos.*;
import com.college.quizportal.model.*;
import com.college.quizportal.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class QuizService {

    private static final String[] DEFAULT_LABELS = {"A", "B", "C", "D", "E", "F"};

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final AnonymousQuizResponseRepository responseRepository;
    private final CryptoTokenService cryptoTokenService;
    private final SettingsService settingsService;
    private final InputSanitizer sanitizer;
    private final AuditLogService auditLogService;

    public QuizService(QuizRepository quizRepository,
                       QuestionRepository questionRepository,
                       AnonymousQuizResponseRepository responseRepository,
                       CryptoTokenService cryptoTokenService,
                       SettingsService settingsService,
                       InputSanitizer sanitizer,
                       AuditLogService auditLogService) {
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.responseRepository = responseRepository;
        this.cryptoTokenService = cryptoTokenService;
        this.settingsService = settingsService;
        this.sanitizer = sanitizer;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<AdminQuizSummaryDto> listQuizzes(QuizStatus statusFilter, String search) {
        List<Quiz> quizzes = statusFilter != null
            ? quizRepository.findByStatusOrderByCreatedAtDesc(statusFilter)
            : quizRepository.findAllByOrderByCreatedAtDesc();

        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
        String baseUrl = settingsService.getPublicBaseUrl();

        Map<Long, long[]> statsMap = new HashMap<>();
        for (Object[] row : responseRepository.countTotalsAndCorrectGroupedByQuiz()) {
            Long quizId = ((Number) row[0]).longValue();
            long total = ((Number) row[1]).longValue();
            long correct = row[2] == null ? 0L : ((Number) row[2]).longValue();
            statsMap.put(quizId, new long[]{total, correct});
        }

        return quizzes.stream()
            .filter(q -> normalizedSearch.isEmpty()
                || q.getTitle().toLowerCase().contains(normalizedSearch)
                || (q.getCourseCode() != null && q.getCourseCode().toLowerCase().contains(normalizedSearch))
                || (q.getDepartment() != null && q.getDepartment().toLowerCase().contains(normalizedSearch)))
            .map(q -> {
                long questionCount = questionRepository.countByQuizId(q.getId());
                long[] stat = statsMap.getOrDefault(q.getId(), new long[]{0L, 0L});
                double accuracy = stat[0] == 0 ? 0.0 : roundTwo((stat[1] * 100.0) / stat[0]);
                return new AdminQuizSummaryDto(
                    q.getId(),
                    q.getPublicCode(),
                    baseUrl + "/quiz/" + q.getPublicCode(),
                    q.getTitle(),
                    q.getDescription(),
                    q.getCourseCode(),
                    q.getDepartment(),
                    q.getStatus(),
                    q.getStartsAt(),
                    q.getEndsAt(),
                    questionCount,
                    stat[0],
                    accuracy,
                    q.getCreatedBy() != null ? q.getCreatedBy().getFullName() : "Admin",
                    q.getCreatedAt(),
                    q.getUpdatedAt()
                );
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public AdminQuizDetailDto getQuizDetail(Long quizId) {
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));
        List<Question> questions = questionRepository.findByQuizIdWithOptions(quizId);
        String baseUrl = settingsService.getPublicBaseUrl();
        long totalSubmissions = responseRepository.countByQuizId(quizId);

        List<AdminQuestionDto> questionDtos = questions.stream()
            .map(q -> toAdminQuestionDto(q, baseUrl))
            .toList();

        return new AdminQuizDetailDto(
            quiz.getId(),
            quiz.getPublicCode(),
            baseUrl + "/quiz/" + quiz.getPublicCode(),
            quiz.getTitle(),
            quiz.getDescription(),
            quiz.getCourseCode(),
            quiz.getDepartment(),
            quiz.getStatus(),
            quiz.getStartsAt(),
            quiz.getEndsAt(),
            totalSubmissions,
            quiz.getCreatedBy() != null ? quiz.getCreatedBy().getFullName() : "Admin",
            questionDtos,
            quiz.getCreatedAt(),
            quiz.getUpdatedAt()
        );
    }

    @Transactional
    public AdminQuizDetailDto createQuiz(CreateQuizRequest req, User actor) {
        validateSchedule(req.startsAt(), req.endsAt());
        Quiz quiz = new Quiz();
        quiz.setPublicCode(generateUniqueQuizCode());
        quiz.setTitle(sanitizer.sanitizeRequiredText(req.title()));
        quiz.setDescription(sanitizer.sanitizePlainText(req.description()));
        quiz.setCourseCode(sanitizer.sanitizePlainText(req.courseCode()));
        quiz.setDepartment(sanitizer.sanitizePlainText(req.department()));
        quiz.setStatus(req.status() != null ? req.status() : QuizStatus.DRAFT);
        quiz.setStartsAt(req.startsAt());
        quiz.setEndsAt(req.endsAt());
        quiz.setCreatedBy(actor);

        Quiz saved = quizRepository.save(quiz);
        auditLogService.record(actor, "QUIZ_CREATED", "QUIZ", String.valueOf(saved.getId()),
            "Created quiz '" + saved.getTitle() + "' (" + saved.getStatus() + ")");
        return getQuizDetail(saved.getId());
    }

    @Transactional
    public AdminQuizDetailDto updateQuiz(Long quizId, UpdateQuizRequest req, User actor) {
        validateSchedule(req.startsAt(), req.endsAt());
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        quiz.setTitle(sanitizer.sanitizeRequiredText(req.title()));
        quiz.setDescription(sanitizer.sanitizePlainText(req.description()));
        quiz.setCourseCode(sanitizer.sanitizePlainText(req.courseCode()));
        quiz.setDepartment(sanitizer.sanitizePlainText(req.department()));
        if (req.status() != null) {
            quiz.setStatus(req.status());
        }
        quiz.setStartsAt(req.startsAt());
        quiz.setEndsAt(req.endsAt());

        quizRepository.save(quiz);
        auditLogService.record(actor, "QUIZ_UPDATED", "QUIZ", String.valueOf(quiz.getId()),
            "Updated quiz '" + quiz.getTitle() + "'");
        return getQuizDetail(quiz.getId());
    }

    @Transactional
    public AdminQuizDetailDto updateQuizStatus(Long quizId, QuizStatus status, User actor) {
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        if (status == QuizStatus.PUBLISHED && questionRepository.countByQuizId(quizId) == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one MCQ question before publishing a quiz");
        }

        quiz.setStatus(status);
        quizRepository.save(quiz);
        auditLogService.record(actor, "QUIZ_" + status.name(), "QUIZ", String.valueOf(quiz.getId()),
            "Changed quiz '" + quiz.getTitle() + "' status to " + status);
        return getQuizDetail(quiz.getId());
    }

    @Transactional
    public void deleteQuiz(Long quizId, User actor) {
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));
        String title = quiz.getTitle();
        quizRepository.delete(quiz);
        auditLogService.record(actor, "QUIZ_DELETED", "QUIZ", String.valueOf(quizId),
            "Deleted quiz '" + title + "'");
    }

    @Transactional
    public AdminQuestionDto addQuestion(Long quizId, QuestionUpsertRequest req, User actor) {
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));
        validateOptions(req.options());

        Question question = new Question();
        question.setQuiz(quiz);
        question.setPublicCode(generateUniqueQuestionCode());
        question.setQuestionText(sanitizer.sanitizeRequiredText(req.questionText()));
        question.setExplanation(sanitizer.sanitizePlainText(req.explanation()));
        int nextOrder = req.orderIndex() != null
            ? req.orderIndex()
            : (int) questionRepository.countByQuizId(quizId) + 1;
        question.setOrderIndex(nextOrder);
        question.setStatus(req.status() != null ? req.status() : QuestionStatus.ACTIVE);

        List<QuestionOption> builtOptions = new ArrayList<>();
        for (int i = 0; i < req.options().size(); i++) {
            OptionInput input = req.options().get(i);
            QuestionOption opt = new QuestionOption();
            opt.setQuestion(question);
            opt.setOptionLabel(resolveLabel(input.optionLabel(), i));
            opt.setOptionText(sanitizer.sanitizeRequiredText(input.optionText()));
            opt.setCorrect(input.correct());
            opt.setOrderIndex(i + 1);
            builtOptions.add(opt);
        }
        question.setOptions(builtOptions);

        Question saved = questionRepository.save(question);
        auditLogService.record(actor, "QUESTION_CREATED", "QUESTION", String.valueOf(saved.getId()),
            "Added question to quiz #" + quizId);
        return toAdminQuestionDto(saved, settingsService.getPublicBaseUrl());
    }

    @Transactional
    public AdminQuestionDto updateQuestion(Long questionId, QuestionUpsertRequest req, User actor) {
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        validateOptions(req.options());

        question.setQuestionText(sanitizer.sanitizeRequiredText(req.questionText()));
        question.setExplanation(sanitizer.sanitizePlainText(req.explanation()));
        if (req.orderIndex() != null) {
            question.setOrderIndex(req.orderIndex());
        }
        if (req.status() != null) {
            question.setStatus(req.status());
        }

        long existingResponses = responseRepository.countByQuestionId(questionId);
        Map<Long, QuestionOption> existingById = question.getOptions().stream()
            .collect(Collectors.toMap(QuestionOption::getId, Function.identity()));

        Set<Long> incomingIds = req.options().stream()
            .map(OptionInput::id)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        if (existingResponses > 0) {
            for (Long existingId : existingById.keySet()) {
                if (!incomingIds.contains(existingId)) {
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Cannot delete an option from a question that already has submissions. Close this question and create a new one instead."
                    );
                }
            }
        }

        List<QuestionOption> updatedOptions = new ArrayList<>();
        for (int i = 0; i < req.options().size(); i++) {
            OptionInput input = req.options().get(i);
            QuestionOption opt = (input.id() != null && existingById.containsKey(input.id()))
                ? existingById.get(input.id())
                : new QuestionOption();
            opt.setQuestion(question);
            opt.setOptionLabel(resolveLabel(input.optionLabel(), i));
            opt.setOptionText(sanitizer.sanitizeRequiredText(input.optionText()));
            opt.setCorrect(input.correct());
            opt.setOrderIndex(i + 1);
            updatedOptions.add(opt);
        }

        question.getOptions().clear();
        question.getOptions().addAll(updatedOptions);

        Question saved = questionRepository.save(question);
        auditLogService.record(actor, "QUESTION_UPDATED", "QUESTION", String.valueOf(saved.getId()),
            "Updated question #" + saved.getId());
        return toAdminQuestionDto(saved, settingsService.getPublicBaseUrl());
    }

    @Transactional
    public AdminQuestionDto updateQuestionStatus(Long questionId, QuestionStatus status, User actor) {
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        question.setStatus(status);
        Question saved = questionRepository.save(question);
        auditLogService.record(actor, "QUESTION_" + status.name(), "QUESTION", String.valueOf(saved.getId()),
            "Changed question status to " + status);
        return toAdminQuestionDto(saved, settingsService.getPublicBaseUrl());
    }

    @Transactional
    public void deleteQuestion(Long questionId, User actor) {
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        questionRepository.delete(question);
        auditLogService.record(actor, "QUESTION_DELETED", "QUESTION", String.valueOf(questionId),
            "Deleted question #" + questionId);
    }

    private AdminQuestionDto toAdminQuestionDto(Question q, String baseUrl) {
        long count = responseRepository.countByQuestionId(q.getId());
        List<AdminOptionDto> optionDtos = q.getOptions().stream()
            .sorted(Comparator.comparingInt(QuestionOption::getOrderIndex).thenComparing(QuestionOption::getId))
            .map(o -> new AdminOptionDto(
                o.getId(),
                o.getOptionLabel(),
                o.getOptionText(),
                o.isCorrect(),
                o.getOrderIndex()
            ))
            .toList();

        return new AdminQuestionDto(
            q.getId(),
            q.getQuiz().getId(),
            q.getPublicCode(),
            baseUrl + "/q/" + q.getPublicCode(),
            q.getQuestionText(),
            q.getExplanation(),
            q.getOrderIndex(),
            q.getStatus(),
            count,
            optionDtos,
            q.getCreatedAt(),
            q.getUpdatedAt()
        );
    }

    private void validateOptions(List<OptionInput> options) {
        if (options == null || options.size() < 2 || options.size() > 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each MCQ question must have between 2 and 6 options");
        }
        long correctCount = options.stream().filter(OptionInput::correct).count();
        if (correctCount != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exactly one option must be marked as the correct answer");
        }
        Set<String> seenLabels = new HashSet<>();
        for (int i = 0; i < options.size(); i++) {
            String label = resolveLabel(options.get(i).optionLabel(), i);
            if (!seenLabels.add(label)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate option label: " + label);
            }
            if (sanitizer.sanitizeRequiredText(options.get(i).optionText()).isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Option text cannot be empty");
            }
        }
    }

    private void validateSchedule(java.time.Instant startsAt, java.time.Instant endsAt) {
        if (startsAt != null && endsAt != null && !endsAt.isAfter(startsAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }
    }

    private String resolveLabel(String inputLabel, int index) {
        if (inputLabel != null && !inputLabel.isBlank()) {
            return sanitizer.sanitizeRequiredText(inputLabel).toUpperCase();
        }
        return index < DEFAULT_LABELS.length ? DEFAULT_LABELS[index] : String.valueOf(index + 1);
    }

    private String generateUniqueQuizCode() {
        String code;
        do {
            code = cryptoTokenService.generatePublicCode("qz");
        } while (quizRepository.existsByPublicCode(code));
        return code;
    }

    private String generateUniqueQuestionCode() {
        String code;
        do {
            code = cryptoTokenService.generatePublicCode("qn");
        } while (questionRepository.existsByPublicCode(code));
        return code;
    }

    private double roundTwo(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
