package com.college.quizportal.controller;

import com.college.quizportal.dto.PublicQuizDtos.*;
import com.college.quizportal.dto.SettingsDtos.PublicPortalInfoDto;
import com.college.quizportal.service.CryptoTokenService;
import com.college.quizportal.service.PublicQuizService;
import com.college.quizportal.service.SettingsService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Set;

@RestController
@RequestMapping("/api/public")
public class PublicQuizController {

    private static final String SUBMITTED_COOKIE_NAME = "cq_submitted";

    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${app.security.cookie-same-site:Lax}")
    private String cookieSameSite;

    private final PublicQuizService publicQuizService;
    private final SettingsService settingsService;
    private final CryptoTokenService cryptoTokenService;

    public PublicQuizController(PublicQuizService publicQuizService,
                                SettingsService settingsService,
                                CryptoTokenService cryptoTokenService) {
        this.publicQuizService = publicQuizService;
        this.settingsService = settingsService;
        this.cryptoTokenService = cryptoTokenService;
    }

    @GetMapping("/health")
    public ResponseEntity<java.util.Map<String, String>> health() {
        return ResponseEntity.ok(java.util.Map.of("status", "UP"));
    }

    @GetMapping("/portal-info")
    public ResponseEntity<PublicPortalInfoDto> portalInfo() {
        return ResponseEntity.ok(settingsService.getPublicPortalInfo());
    }

    @GetMapping("/quizzes/{publicCode}")
    public ResponseEntity<PublicQuizDto> getQuiz(@PathVariable String publicCode,
                                                 HttpServletRequest request) {
        Set<String> submitted = readSubmittedCodes(request);
        return ResponseEntity.ok(publicQuizService.getPublicQuiz(publicCode, submitted));
    }

    @GetMapping("/questions/{publicCode}")
    public ResponseEntity<PublicQuestionDto> getQuestion(@PathVariable String publicCode,
                                                         HttpServletRequest request) {
        Set<String> submitted = readSubmittedCodes(request);
        return ResponseEntity.ok(publicQuizService.getPublicQuestion(publicCode, submitted));
    }

    @PostMapping("/tokens/issue")
    public ResponseEntity<IssueTokenResponse> issueToken(@Valid @RequestBody IssueTokenRequest body,
                                                         HttpServletRequest request) {
        Set<String> submitted = readSubmittedCodes(request);
        return ResponseEntity.ok(publicQuizService.issueSubmissionToken(body.questionPublicCode(), submitted));
    }

    @PostMapping("/questions/{publicCode}/submit")
    public ResponseEntity<AnswerResultDto> submitAnswer(@PathVariable String publicCode,
                                                        @Valid @RequestBody SubmitAnswerRequest body,
                                                        HttpServletRequest request,
                                                        HttpServletResponse response) {
        Set<String> submitted = readSubmittedCodes(request);
        AnswerResultDto result = publicQuizService.submitAnswer(publicCode, body, submitted);

        submitted.add(result.questionPublicCode());
        String encoded = cryptoTokenService.encodeSubmittedCodesCookie(submitted);
        ResponseCookie cookie = ResponseCookie.from(SUBMITTED_COOKIE_NAME, encoded)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/api/public")
            .maxAge(Duration.ofDays(30))
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(result);
    }

    private Set<String> readSubmittedCodes(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if (SUBMITTED_COOKIE_NAME.equals(c.getName())) {
                    return cryptoTokenService.decodeSubmittedCodesCookie(c.getValue());
                }
            }
        }
        return new java.util.LinkedHashSet<>();
    }
}
