package com.college.quizportal.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Ephemeral in-memory sliding-window rate limiter.
 * Bucket keys are one-way hashed with an in-memory per-boot salt and NEVER persisted or logged,
 * preserving student privacy while mitigating brute-force and spam floods.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;

    @Value("${app.portal.rate-limit-per-minute:60}")
    private int defaultRequestsPerMinute;

    private final String ephemeralSalt;
    private final ConcurrentHashMap<String, Deque<Long>> buckets = new ConcurrentHashMap<>();

    public RateLimitingFilter() {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        this.ephemeralSalt = Base64.getEncoder().encodeToString(bytes);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        int limit = resolveLimitForPath(path, request.getMethod());
        if (limit <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        String bucketKey = hashKey(extractClientKey(request), routeGroup(path));
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = buckets.computeIfAbsent(bucketKey, k -> new ConcurrentLinkedDeque<>());

        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= limit) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.setHeader("Retry-After", "60");
                response.getWriter().write("{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Please wait a minute and try again.\"}");
                return;
            }
            timestamps.addLast(now);
        }

        // Prevent unbounded map growth
        if (buckets.size() > 10_000) {
            buckets.clear();
        }

        filterChain.doFilter(request, response);
    }

    private int resolveLimitForPath(String path, String method) {
        if ("POST".equalsIgnoreCase(method) && "/api/auth/login".equals(path)) {
            return Math.max(15, Math.min(defaultRequestsPerMinute, 30));
        }
        if ("POST".equalsIgnoreCase(method) && "/api/public/feedback".equals(path)) {
            return Math.max(10, Math.min(defaultRequestsPerMinute, 20));
        }
        if ("POST".equalsIgnoreCase(method) && path.startsWith("/api/public/")) {
            return Math.max(30, defaultRequestsPerMinute);
        }
        return -1;
    }

    private String routeGroup(String path) {
        if (path.startsWith("/api/auth/")) return "auth";
        if (path.startsWith("/api/public/feedback")) return "feedback";
        return "quiz-public";
    }

    private String extractClientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private String hashKey(String clientKey, String group) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((clientKey + "|" + group + "|" + ephemeralSalt).getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (Exception e) {
            return group;
        }
    }
}
