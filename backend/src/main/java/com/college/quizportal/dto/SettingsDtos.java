package com.college.quizportal.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class SettingsDtos {

    private SettingsDtos() {}

    public record PortalSettingsDto(
        String collegeName,
        String portalTitle,
        String publicBaseUrl,
        boolean allowAnonymousFeedback,
        int rateLimitPerMinute,
        String privacyNotice,
        Instant updatedAt
    ) {}

    public record PublicPortalInfoDto(
        String collegeName,
        String portalTitle,
        boolean allowAnonymousFeedback,
        String privacyNotice
    ) {}

    public record UpdatePortalSettingsRequest(
        @NotBlank(message = "College name is required")
        @Size(max = 200)
        String collegeName,

        @NotBlank(message = "Portal title is required")
        @Size(max = 200)
        String portalTitle,

        @NotBlank(message = "Public base URL is required")
        @Size(max = 300)
        String publicBaseUrl,

        boolean allowAnonymousFeedback,

        @Min(value = 10, message = "Rate limit must be at least 10 requests per minute")
        @Max(value = 1000, message = "Rate limit must not exceed 1000 requests per minute")
        int rateLimitPerMinute,

        @NotBlank(message = "Privacy notice is required")
        @Size(max = 4000)
        String privacyNotice
    ) {}

    public record AuditLogDto(
        Long id,
        String actorEmail,
        String action,
        String entityType,
        String entityId,
        String details,
        Instant createdAt
    ) {}
}
