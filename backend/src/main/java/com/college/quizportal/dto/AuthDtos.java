package com.college.quizportal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record LoginRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 128, message = "Password must be between 6 and 128 characters")
        String password
    ) {}

    public record UserProfileDto(
        Long id,
        String email,
        String fullName,
        String department,
        String role
    ) {}

    public record LoginResponse(
        String token,
        UserProfileDto user
    ) {}

    public record ChangePasswordRequest(
        @NotBlank(message = "Current password is required")
        String currentPassword,

        @NotBlank(message = "New password is required")
        @Size(min = 8, max = 128, message = "New password must be at least 8 characters")
        String newPassword
    ) {}
}
