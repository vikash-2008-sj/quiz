package com.college.quizportal.controller;

import com.college.quizportal.config.JwtAuthenticationFilter;
import com.college.quizportal.config.JwtService;
import com.college.quizportal.dto.AuthDtos.*;
import com.college.quizportal.model.User;
import com.college.quizportal.service.AuthService;
import com.college.quizportal.service.CryptoTokenService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${app.security.cookie-same-site:Lax}")
    private String cookieSameSite;

    private final AuthService authService;
    private final JwtService jwtService;
    private final CryptoTokenService cryptoTokenService;

    public AuthController(AuthService authService,
                          JwtService jwtService,
                          CryptoTokenService cryptoTokenService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.cryptoTokenService = cryptoTokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        LoginResponse result = authService.login(request);
        long maxAge = jwtService.getExpirationSeconds();

        ResponseCookie authCookie = ResponseCookie.from(JwtAuthenticationFilter.AUTH_COOKIE_NAME, result.token())
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(maxAge)
            .build();

        String xsrfToken = cryptoTokenService.generateOneTimeSubmissionToken();
        ResponseCookie xsrfCookie = ResponseCookie.from(JwtAuthenticationFilter.XSRF_COOKIE_NAME, xsrfToken)
            .httpOnly(false)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(maxAge)
            .build();

        response.addHeader(HttpHeaders.SET_COOKIE, authCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, xsrfCookie.toString());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        ResponseCookie clearAuth = ResponseCookie.from(JwtAuthenticationFilter.AUTH_COOKIE_NAME, "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(0)
            .build();
        ResponseCookie clearXsrf = ResponseCookie.from(JwtAuthenticationFilter.XSRF_COOKIE_NAME, "")
            .httpOnly(false)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(0)
            .build();

        response.addHeader(HttpHeaders.SET_COOKIE, clearAuth.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, clearXsrf.toString());
        return ResponseEntity.ok(Map.of("message", "Signed out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.toProfile(user));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@AuthenticationPrincipal User user,
                                                              @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(user, request);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }
}
