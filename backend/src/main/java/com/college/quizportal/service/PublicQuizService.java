package com.college.quizportal.service;

import com.college.quizportal.dto.PublicQuizDtos.*;
import com.college.quizportal.model.*;
import com.college.quizportal.repository.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class PublicQuizService {

    private static final Duration TOKEN_TTL = Duration.ofHours(4);

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final SubmissionTokenRepository tokenRepository;
    private final AnonymousQuizResponseRepository responseRepository;
    private final CryptoTokenService cryptoTokenService;

    public PublicQuizService(QuizRepository quizRepository,
                             QuestionRepository questionRepository,
                             QuestionOptionRepository optionRepository,
                             SubmissionTokenRepository tokenRepository,
                             AnonymousQuizResponseRepository responseRepository,
                             CryptoTokenService cryptoTokenService) {
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.tokenRepository = tokenRepository;
        this.responseRepository = responseRepository;
        this.cryptoTokenService = cryptoTokenService;
    }

    @Transactional(readOnly = true)
    public PublicQuizDto getPublicQuiz(String quizPublicCode, Set<String> submittedQuestionCodes) {
        Quiz quiz = quizRepository.findByPublicCode(quizPublicCode.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found. Please check your QR code or link."));

        if (quiz.getStatus() == QuizStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This quiz has not been published yet.");
        }

        List<Question> questions = questionRepository.findByQuizIdWithOptions(quiz.getId());
        List<PublicQuestionDto> publicQuestions = questions.stream()
            .map(q -> toPublicQuestionDto(q, quiz, submittedQuestionCodes.contains(q.getPublicCode())))
            .toList();

        return new PublicQuizDto(
            quiz.getId(),
            quiz.getPublicCode(),
            quiz.getTitle(),
            quiz.getDescription(),
            quiz.getCourseCode(),
            quiz.getDepartment(),
            quiz.getStatus().name(),
            publicQuestions
        );
    }

    @Transactional(readOnly = true)
    public PublicQuestionDto getPublicQuestion(String questionPublicCode, Set<String> submittedQuestionCodes) {
        Question question = questionRepository.findByPublicCodeWithOptionsAndQuiz(questionPublicCode.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found. Please check your QR code or link."));

        Quiz quiz = question.getQuiz();
        if (quiz.getStatus() == QuizStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This question is not available yet.");
        }

        return toPublicQuestionDto(question, quiz, submittedQuestionCodes.contains(question.getPublicCode()));
    }

    @Transactional
    public IssueTokenResponse issueSubmissionToken(String questionPublicCode, Set<String> submittedQuestionCodes) {
        Question question = questionRepository.findByPublicCodeWithOptionsAndQuiz(questionPublicCode.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        validateQuestionAcceptingSubmissions(question, question.getQuiz());

        if (submittedQuestionCodes.contains(question.getPublicCode())) {
            return new IssueTokenResponse(null, true, null);
        }

        String rawToken = cryptoTokenService.generateOneTimeSubmissionToken();
        String tokenHash = cryptoTokenService.hashSubmissionToken(rawToken);
        Instant expiresAt = Instant.now().plus(TOKEN_TTL);

        SubmissionToken token = new SubmissionToken();
        token.setQuestion(question);
        token.setTokenHash(tokenHash);
        token.setUsed(false);
        token.setExpiresAt(expiresAt);
        tokenRepository.save(token);

        return new IssueTokenResponse(rawToken, false, expiresAt);
    }

    @Transactional
    public AnswerResultDto submitAnswer(String questionPublicCode,
                                        SubmitAnswerRequest request,
                                        Set<String> submittedQuestionCodes) {
        Question question = questionRepository.findByPublicCodeWithOptionsAndQuiz(questionPublicCode.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        Quiz quiz = question.getQuiz();
        validateQuestionAcceptingSubmissions(question, quiz);

        if (submittedQuestionCodes.contains(question.getPublicCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already submitted an answer for this question.");
        }

        String tokenHash = cryptoTokenService.hashSubmissionToken(request.submissionToken().trim());
        Instant now = Instant.now();

        // Check duplicate response before or during atomic consumption
        if (responseRepository.existsByQuestionIdAndTokenHash(question.getId(), tokenHash)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate submission detected. Each student may submit only once.");
        }

        int consumed = tokenRepository.consumeToken(tokenHash, question.getId(), now);
        if (consumed == 0) {
            SubmissionToken existing = tokenRepository.findByTokenHashAndQuestionId(tokenHash, question.getId()).orElse(null);
            if (existing != null && existing.isUsed()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This submission token has already been used. Duplicate submissions are not allowed.");
            }
            if (existing != null && !existing.getExpiresAt().isAfter(now)) {
                throw new ResponseStatusException(HttpStatus.GONE, "Your quiz session token expired. Please reload the page to try again.");
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or missing one-time submission token.");
        }

        QuestionOption selectedOption = optionRepository.findByIdAndQuestionId(request.selectedOptionId(), question.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected option does not belong to this question."));

        QuestionOption correctOption = question.getOptions().stream()
            .filter(QuestionOption::isCorrect)
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Question is missing a configured correct answer"));

        AnonymousQuizResponse response = new AnonymousQuizResponse();
        response.setQuiz(quiz);
        response.setQuestion(question);
        response.setSelectedOption(selectedOption);
        response.setCorrect(selectedOption.isCorrect());
        response.setTokenHash(tokenHash);

        try {
            responseRepository.saveAndFlush(response);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate submission detected.");
        }

        // ONLY after successful server-side validation and persistence do we reveal the correct answer & explanation.
        return new AnswerResultDto(
            question.getId(),
            question.getPublicCode(),
            selectedOption.getId(),
            selectedOption.isCorrect(),
            correctOption.getId(),
            correctOption.getOptionLabel(),
            correctOption.getOptionText(),
            question.getExplanation(),
            response.getSubmittedAt()
        );
    }

    private void validateQuestionAcceptingSubmissions(Question question, Quiz quiz) {
        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                quiz.getStatus() == QuizStatus.CLOSED
                    ? "This quiz is closed and no longer accepts answers."
                    : "This quiz is not published yet.");
        }
        Instant now = Instant.now();
        if (quiz.getStartsAt() != null && now.isBefore(quiz.getStartsAt())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This quiz has not started yet.");
        }
        if (quiz.getEndsAt() != null && now.isAfter(quiz.getEndsAt())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This quiz window has ended.");
        }
        if (question.getStatus() != QuestionStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This question is currently closed for submissions.");
        }
    }

    /**
     * Intentionally maps only non-sensitive public fields. Never exposes `correct` or `explanation`.
     */
    private PublicQuestionDto toPublicQuestionDto(Question question, Quiz quiz, boolean alreadySubmitted) {
        List<PublicOptionDto> options = question.getOptions().stream()
            .sorted(Comparator.comparingInt(QuestionOption::getOrderIndex).thenComparing(QuestionOption::getId))
            .map(o -> new PublicOptionDto(
                o.getId(),
                o.getOptionLabel(),
                o.getOptionText(),
                o.getOrderIndex()
            ))
            .toList();

        return new PublicQuestionDto(
            question.getId(),
            question.getPublicCode(),
            quiz.getId(),
            quiz.getPublicCode(),
            quiz.getTitle(),
            quiz.getCourseCode(),
            quiz.getDepartment(),
            question.getQuestionText(),
            question.getStatus().name(),
            quiz.getStatus().name(),
            question.getOrderIndex(),
            alreadySubmitted,
            options
        );
    }
}
