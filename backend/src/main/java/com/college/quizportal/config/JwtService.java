package com.college.quizportal.config;

import com.college.quizportal.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Date;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    @Value("${app.security.jwt-secret:}")
    private String configuredSecret;

    @Value("${app.security.jwt-expiration-ms:28800000}")
    private long expirationMs;

    private SecretKey signingKey;

    @PostConstruct
    void init() {
        byte[] keyBytes;
        if (configuredSecret == null || configuredSecret.isBlank()) {
            keyBytes = new byte[64];
            new SecureRandom().nextBytes(keyBytes);
            log.warn("JWT_SECRET is not configured; generated an ephemeral signing key for this runtime. Configure JWT_SECRET in production.");
        } else {
            keyBytes = configuredSecret.getBytes(StandardCharsets.UTF_8);
            if (keyBytes.length < 32) {
                throw new IllegalStateException("JWT_SECRET must be at least 32 bytes long");
            }
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
            .subject(user.getEmail())
            .claim("uid", user.getId())
            .claim("role", user.getRole().getName().name())
            .issuedAt(now)
            .expiration(expiry)
            .signWith(signingKey)
            .compact();
    }

    public Claims parseAndValidate(String token) throws JwtException {
        return Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public long getExpirationSeconds() {
        return expirationMs / 1000L;
    }
}
