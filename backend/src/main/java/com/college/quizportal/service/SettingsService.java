package com.college.quizportal.service;

import com.college.quizportal.dto.SettingsDtos.*;
import com.college.quizportal.model.PortalSetting;
import com.college.quizportal.model.User;
import com.college.quizportal.repository.AuditLogRepository;
import com.college.quizportal.repository.PortalSettingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

@Service
public class SettingsService {

    public static final String DEFAULT_PRIVACY_NOTICE =
        "This portal separates student quiz participation and anonymous feedback from all user accounts. " +
        "Anonymous feedback does not require sign-in and stores no student identity, account link, or IP address " +
        "in the application database. Privacy limitation notice: external network infrastructure such as campus Wi-Fi, " +
        "reverse proxies, firewalls, or hosting provider access logs may still record network traffic metadata outside " +
        "the application's control unless explicitly disabled by your institution's IT administrators.";

    private final PortalSettingRepository settingRepository;
    private final AuditLogRepository auditLogRepository;
    private final InputSanitizer sanitizer;
    private final AuditLogService auditLogService;

    @Value("${app.portal.public-base-url:http://localhost:5173}")
    private String defaultPublicBaseUrl;

    @Value("${app.portal.rate-limit-per-minute:60}")
    private int defaultRateLimit;

    public SettingsService(PortalSettingRepository settingRepository,
                           AuditLogRepository auditLogRepository,
                           InputSanitizer sanitizer,
                           AuditLogService auditLogService) {
        this.settingRepository = settingRepository;
        this.auditLogRepository = auditLogRepository;
        this.sanitizer = sanitizer;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public PortalSetting getOrCreateSettings() {
        return settingRepository.findTopByOrderByIdAsc().orElseGet(() -> {
            PortalSetting s = new PortalSetting();
            s.setCollegeName("National Institute of Engineering & Sciences");
            s.setPortalTitle("College Quiz & Anonymous Feedback Portal");
            s.setPublicBaseUrl(normalizeBaseUrl(defaultPublicBaseUrl));
            s.setAllowAnonymousFeedback(true);
            s.setRateLimitPerMinute(defaultRateLimit);
            s.setPrivacyNotice(DEFAULT_PRIVACY_NOTICE);
            return settingRepository.save(s);
        });
    }

    @Transactional(readOnly = true)
    public PortalSettingsDto getAdminSettings() {
        PortalSetting s = getOrCreateSettings();
        return toDto(s);
    }

    @Transactional(readOnly = true)
    public PublicPortalInfoDto getPublicPortalInfo() {
        PortalSetting s = getOrCreateSettings();
        return new PublicPortalInfoDto(
            s.getCollegeName(),
            s.getPortalTitle(),
            s.isAllowAnonymousFeedback(),
            s.getPrivacyNotice()
        );
    }

    public String getPublicBaseUrl() {
        return normalizeBaseUrl(getOrCreateSettings().getPublicBaseUrl());
    }

    @Transactional
    public PortalSettingsDto updateSettings(UpdatePortalSettingsRequest request, User actor) {
        String normalizedUrl = normalizeBaseUrl(request.publicBaseUrl());
        validateHttpUrl(normalizedUrl);

        PortalSetting s = getOrCreateSettings();
        s.setCollegeName(sanitizer.sanitizeRequiredText(request.collegeName()));
        s.setPortalTitle(sanitizer.sanitizeRequiredText(request.portalTitle()));
        s.setPublicBaseUrl(normalizedUrl);
        s.setAllowAnonymousFeedback(request.allowAnonymousFeedback());
        s.setRateLimitPerMinute(request.rateLimitPerMinute());
        s.setPrivacyNotice(sanitizer.sanitizeRequiredText(request.privacyNotice()));

        PortalSetting saved = settingRepository.save(s);
        auditLogService.record(actor, "SETTINGS_UPDATED", "PORTAL_SETTINGS", String.valueOf(saved.getId()),
            "Updated portal settings (base URL: " + normalizedUrl + ", feedback enabled: " + saved.isAllowAnonymousFeedback() + ")");
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<AuditLogDto> getRecentAuditLogs(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit))
            .stream()
            .map(l -> new AuditLogDto(
                l.getId(),
                l.getActorEmail(),
                l.getAction(),
                l.getEntityType(),
                l.getEntityId(),
                l.getDetails(),
                l.getCreatedAt()
            ))
            .toList();
    }

    private PortalSettingsDto toDto(PortalSetting s) {
        return new PortalSettingsDto(
            s.getCollegeName(),
            s.getPortalTitle(),
            s.getPublicBaseUrl(),
            s.isAllowAnonymousFeedback(),
            s.getRateLimitPerMinute(),
            s.getPrivacyNotice(),
            s.getUpdatedAt()
        );
    }

    private String normalizeBaseUrl(String url) {
        String trimmed = url == null ? "http://localhost:5173" : url.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private void validateHttpUrl(String url) {
        try {
            URI uri = URI.create(url);
            if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Public base URL must use http or https");
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Public base URL must include a valid host");
            }
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid public base URL format");
        }
    }
}
