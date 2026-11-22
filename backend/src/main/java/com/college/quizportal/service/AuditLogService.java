package com.college.quizportal.service;

import com.college.quizportal.model.AuditLog;
import com.college.quizportal.model.User;
import com.college.quizportal.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void record(User actor, String action, String entityType, String entityId, String details) {
        AuditLog log = new AuditLog();
        log.setActorUser(actor);
        log.setActorEmail(actor != null ? actor.getEmail() : null);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDetails(details != null && details.length() > 500 ? details.substring(0, 500) : details);
        auditLogRepository.save(log);
    }

    @Transactional
    public void recordAnonymousActorEmail(String email, String action, String details) {
        AuditLog log = new AuditLog();
        log.setActorEmail(email);
        log.setAction(action);
        log.setEntityType("AUTH");
        log.setDetails(details != null && details.length() > 500 ? details.substring(0, 500) : details);
        auditLogRepository.save(log);
    }
}
