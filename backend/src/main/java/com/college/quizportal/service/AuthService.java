package com.college.quizportal.service;

import com.college.quizportal.config.JwtService;
import com.college.quizportal.dto.AuthDtos.*;
import com.college.quizportal.model.User;
import com.college.quizportal.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);

        if (user == null || !user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            auditLogService.recordAnonymousActorEmail(normalizedEmail, "LOGIN_FAILED", "Invalid login attempt");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtService.generateToken(user);
        auditLogService.record(user, "USER_LOGIN", "USER", String.valueOf(user.getId()),
            "Signed in with role " + user.getRole().getName());

        return new LoginResponse(token, toProfile(user));
    }

    public User getUserByEmailOrThrow(String email) {
        return userRepository.findByEmailIgnoreCase(email)
            .filter(User::isActive)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account is inactive or not found"));
    }

    public UserProfileDto toProfile(User user) {
        return new UserProfileDto(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getDepartment(),
            user.getRole().getName().name()
        );
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must differ from current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditLogService.record(user, "PASSWORD_CHANGED", "USER", String.valueOf(user.getId()), "Password updated");
    }
}
