package com.college.quizportal.service;

import com.college.quizportal.dto.AnalyticsDtos.*;
import com.college.quizportal.model.*;
import com.college.quizportal.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * Strictly aggregate analytics service.
 * Never returns individual student answers, identities, or token hashes.
 * All percentages use total valid submissions as the denominator.
 */
@Service
public class AnalyticsService {

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final AnonymousQuizResponseRepository responseRepository;
    private final FeedbackRepository feedbackRepository;

    public AnalyticsService(QuizRepository quizRepository,
                            QuestionRepository questionRepository,
                            AnonymousQuizResponseRepository responseRepository,
                            FeedbackRepository feedbackRepository) {
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.responseRepository = responseRepository;
        this.feedbackRepository = feedbackRepository;
    }

    @Transactional(readOnly = true)
    public DashboardOverviewDto getDashboardOverview(boolean includeFeedbackStats) {
        long totalQuizzes = quizRepository.count();
        long publishedQuizzes = quizRepository.countByStatus(QuizStatus.PUBLISHED);
        long totalQuestions = questionRepository.count();
        long totalSubmissions = responseRepository.count();
        long totalCorrect = responseRepository.countByCorrectTrue();
        long totalIncorrect = Math.max(0L, totalSubmissions - totalCorrect);
        double overallAccuracy = calculatePercentage(totalCorrect, totalSubmissions);

        // Staff accounts must NEVER receive feedback metrics or records
        Long pendingFeedback = includeFeedbackStats ? feedbackRepository.countByStatus(FeedbackStatus.NEW) : null;
        Long totalFeedback = includeFeedbackStats ? feedbackRepository.count() : null;
        List<CategoryCountDto> feedbackByCategory = includeFeedbackStats
            ? feedbackRepository.countGroupedByCategory().stream()
                .map(row -> new CategoryCountDto((String) row[0], ((Number) row[1]).longValue()))
                .toList()
            : List.of();

        Map<Long, long[]> statsByQuiz = new HashMap<>();
        for (Object[] row : responseRepository.countTotalsAndCorrectGroupedByQuiz()) {
            Long qId = ((Number) row[0]).longValue();
            long total = ((Number) row[1]).longValue();
            long correct = row[2] == null ? 0L : ((Number) row[2]).longValue();
            statsByQuiz.put(qId, new long[]{total, correct});
        }

        List<QuizComparisonDto> comparisons = quizRepository.findAllByOrderByCreatedAtDesc().stream()
            .limit(8)
            .map(q -> {
                long[] stat = statsByQuiz.getOrDefault(q.getId(), new long[]{0L, 0L});
                long total = stat[0];
                long correct = stat[1];
                long incorrect = Math.max(0L, total - correct);
                return new QuizComparisonDto(
                    q.getId(),
                    q.getTitle(),
                    q.getCourseCode(),
                    q.getStatus().name(),
                    total,
                    correct,
                    incorrect,
                    calculatePercentage(correct, total)
                );
            })
            .toList();

        return new DashboardOverviewDto(
            totalQuizzes,
            publishedQuizzes,
            totalQuestions,
            totalSubmissions,
            totalCorrect,
            totalIncorrect,
            overallAccuracy,
            pendingFeedback,
            totalFeedback,
            comparisons,
            feedbackByCategory
        );
    }

    @Transactional(readOnly = true)
    public QuizAnalyticsDto getQuizAnalytics(Long quizId) {
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));

        List<Question> questions = questionRepository.findByQuizIdWithOptions(quizId);

        Map<Long, Map<Long, Long>> countsByQuestionAndOption = new HashMap<>();
        for (Object[] row : responseRepository.countGroupedByQuestionAndOptionForQuiz(quizId)) {
            Long qId = ((Number) row[0]).longValue();
            Long optId = ((Number) row[1]).longValue();
            long count = ((Number) row[2]).longValue();
            countsByQuestionAndOption
                .computeIfAbsent(qId, k -> new HashMap<>())
                .put(optId, count);
        }

        long quizTotalSubmissions = 0L;
        long quizCorrectCount = 0L;
        List<QuestionAnalyticsDto> questionAnalytics = new ArrayList<>();

        for (Question q : questions) {
            Map<Long, Long> optCounts = countsByQuestionAndOption.getOrDefault(q.getId(), Collections.emptyMap());
            QuestionAnalyticsDto qa = buildQuestionAnalytics(q, optCounts);
            questionAnalytics.add(qa);
            quizTotalSubmissions += qa.totalSubmissions();
            quizCorrectCount += qa.correctCount();
        }

        long quizIncorrectCount = Math.max(0L, quizTotalSubmissions - quizCorrectCount);
        double quizAccuracy = calculatePercentage(quizCorrectCount, quizTotalSubmissions);

        return new QuizAnalyticsDto(
            quiz.getId(),
            quiz.getPublicCode(),
            quiz.getTitle(),
            quiz.getCourseCode(),
            quiz.getDepartment(),
            quiz.getStatus().name(),
            questions.size(),
            quizTotalSubmissions,
            quizCorrectCount,
            quizIncorrectCount,
            quizAccuracy,
            questionAnalytics
        );
    }

    @Transactional(readOnly = true)
    public QuestionAnalyticsDto getQuestionAnalytics(Long questionId) {
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        Map<Long, Long> optCounts = new HashMap<>();
        for (Object[] row : responseRepository.countGroupedByOptionForQuestion(questionId)) {
            optCounts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }

        return buildQuestionAnalytics(question, optCounts);
    }

    private QuestionAnalyticsDto buildQuestionAnalytics(Question q, Map<Long, Long> optionCounts) {
        List<QuestionOption> sortedOptions = q.getOptions().stream()
            .sorted(Comparator.comparingInt(QuestionOption::getOrderIndex).thenComparing(QuestionOption::getId))
            .toList();

        long totalSubmissions = sortedOptions.stream()
            .mapToLong(o -> optionCounts.getOrDefault(o.getId(), 0L))
            .sum();

        long correctCount = sortedOptions.stream()
            .filter(QuestionOption::isCorrect)
            .mapToLong(o -> optionCounts.getOrDefault(o.getId(), 0L))
            .sum();

        long incorrectCount = Math.max(0L, totalSubmissions - correctCount);
        double accuracy = calculatePercentage(correctCount, totalSubmissions);

        List<OptionStatDto> optionStats = sortedOptions.stream()
            .map(o -> {
                long count = optionCounts.getOrDefault(o.getId(), 0L);
                return new OptionStatDto(
                    o.getId(),
                    o.getOptionLabel(),
                    o.getOptionText(),
                    o.isCorrect(),
                    count,
                    calculatePercentage(count, totalSubmissions)
                );
            })
            .toList();

        return new QuestionAnalyticsDto(
            q.getId(),
            q.getPublicCode(),
            q.getQuestionText(),
            q.getStatus().name(),
            q.getOrderIndex(),
            totalSubmissions,
            correctCount,
            incorrectCount,
            accuracy,
            optionStats
        );
    }

    public static double calculatePercentage(long numerator, long denominator) {
        if (denominator <= 0L) {
            return 0.0;
        }
        return Math.round((numerator * 10000.0) / denominator) / 100.0;
    }
}
