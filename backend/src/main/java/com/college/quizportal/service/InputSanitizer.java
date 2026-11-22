package com.college.quizportal.service;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class InputSanitizer {

    private static final Pattern SCRIPT_TAG_PATTERN =
        Pattern.compile("(?is)<\\s*script[^>]*>.*?<\\s*/\\s*script\\s*>");
    private static final Pattern HTML_TAG_PATTERN =
        Pattern.compile("<[^>]+>");
    private static final Pattern CONTROL_CHARS =
        Pattern.compile("[\\p{Cntrl}&&[^\r\n\t]]");

    public String sanitizePlainText(String input) {
        if (input == null) {
            return null;
        }
        String cleaned = SCRIPT_TAG_PATTERN.matcher(input).replaceAll("");
        cleaned = HTML_TAG_PATTERN.matcher(cleaned).replaceAll("");
        cleaned = CONTROL_CHARS.matcher(cleaned).replaceAll("");
        cleaned = cleaned.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    public String sanitizeRequiredText(String input) {
        String cleaned = sanitizePlainText(input);
        return cleaned == null ? "" : cleaned;
    }
}
