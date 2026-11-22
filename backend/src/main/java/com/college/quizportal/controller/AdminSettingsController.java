package com.college.quizportal.controller;

import com.college.quizportal.dto.SettingsDtos.*;
import com.college.quizportal.model.User;
import com.college.quizportal.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingsController {

    private final SettingsService settingsService;

    public AdminSettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/settings")
    public ResponseEntity<PortalSettingsDto> getSettings() {
        return ResponseEntity.ok(settingsService.getAdminSettings());
    }

    @PutMapping("/settings")
    public ResponseEntity<PortalSettingsDto> updateSettings(@Valid @RequestBody UpdatePortalSettingsRequest request,
                                                            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(settingsService.updateSettings(request, user));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLogDto>> getAuditLogs(@RequestParam(defaultValue = "35") int limit) {
        return ResponseEntity.ok(settingsService.getRecentAuditLogs(limit));
    }
}
