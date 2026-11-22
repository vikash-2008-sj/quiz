package com.college.quizportal.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;

@Service
public class CryptoTokenService {

    private static final Logger log = LoggerFactory.getLogger(CryptoTokenService.class);
    private static final String CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${app.security.token-pepper:}")
    private String configuredPepper;

    private String effectivePepper;

    @PostConstruct
    void init() {
        if (configuredPepper == null || configuredPepper.isBlank()) {
            byte[] randomBytes = new byte[32];
            SECURE_RANDOM.nextBytes(randomBytes);
            effectivePepper = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
            log.warn("TOKEN_PEPPER is not set; generated an ephemeral pepper for this runtime. Set TOKEN_PEPPER in production.");
        } else {
            effectivePepper = configuredPepper;
        }
    }

    public String generatePublicCode(String prefix) {
        StringBuilder sb = new StringBuilder(prefix).append("-");
        for (int i = 0; i < 8; i++) {
            sb.append(CODE_ALPHABET.charAt(SECURE_RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    public String generateOneTimeSubmissionToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashSubmissionToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((rawToken + ":" + effectivePepper).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /**
     * Encodes an anonymous, HMAC-signed cookie payload listing submitted question public codes
     * for browser-level duplicate prevention. Contains zero user PII.
     */
    public String encodeSubmittedCodesCookie(Set<String> codes) {
        List<String> sorted = new ArrayList<>(codes);
        Collections.sort(sorted);
        // Keep cookie compact (most recent 60 codes)
        if (sorted.size() > 60) {
            sorted = sorted.subList(sorted.size() - 60, sorted.size());
        }
        String payload = String.join(",", sorted);
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String signature = hmacSha256(encodedPayload);
        return encodedPayload + "." + signature;
    }

    public Set<String> decodeSubmittedCodesCookie(String cookieValue) {
        Set<String> result = new LinkedHashSet<>();
        if (cookieValue == null || !cookieValue.contains(".")) {
            return result;
        }
        String[] parts = cookieValue.split("\\.", 2);
        if (parts.length != 2) {
            return result;
        }
        String expectedSig = hmacSha256(parts[0]);
        if (!MessageDigest.isEqual(
            expectedSig.getBytes(StandardCharsets.UTF_8),
            parts[1].getBytes(StandardCharsets.UTF_8))) {
            return result;
        }
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            if (!decoded.isBlank()) {
                for (String code : decoded.split(",")) {
                    String trimmed = code.trim();
                    if (!trimmed.isEmpty()) {
                        result.add(trimmed);
                    }
                }
            }
        } catch (IllegalArgumentException ignored) {
            return result;
        }
        return result;
    }

    private String hmacSha256(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(effectivePepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }
}
