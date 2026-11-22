package com.college.quizportal.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "portal_settings")
public class PortalSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "college_name", nullable = false, length = 200)
    private String collegeName;

    @Column(name = "portal_title", nullable = false, length = 200)
    private String portalTitle;

    @Column(name = "public_base_url", nullable = false, length = 300)
    private String publicBaseUrl;

    @Column(name = "allow_anonymous_feedback", nullable = false)
    private boolean allowAnonymousFeedback = true;

    @Column(name = "rate_limit_per_minute", nullable = false)
    private int rateLimitPerMinute = 60;

    @Column(name = "privacy_notice", nullable = false, columnDefinition = "TEXT")
    private String privacyNotice;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void onTouch() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCollegeName() { return collegeName; }
    public void setCollegeName(String collegeName) { this.collegeName = collegeName; }

    public String getPortalTitle() { return portalTitle; }
    public void setPortalTitle(String portalTitle) { this.portalTitle = portalTitle; }

    public String getPublicBaseUrl() { return publicBaseUrl; }
    public void setPublicBaseUrl(String publicBaseUrl) { this.publicBaseUrl = publicBaseUrl; }

    public boolean isAllowAnonymousFeedback() { return allowAnonymousFeedback; }
    public void setAllowAnonymousFeedback(boolean allowAnonymousFeedback) { this.allowAnonymousFeedback = allowAnonymousFeedback; }

    public int getRateLimitPerMinute() { return rateLimitPerMinute; }
    public void setRateLimitPerMinute(int rateLimitPerMinute) { this.rateLimitPerMinute = rateLimitPerMinute; }

    public String getPrivacyNotice() { return privacyNotice; }
    public void setPrivacyNotice(String privacyNotice) { this.privacyNotice = privacyNotice; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
