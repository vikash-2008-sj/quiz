package com.college.quizportal.controller;

import com.college.quizportal.service.QrCodeService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/admin/qr")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminQrController {

    private final QrCodeService qrCodeService;

    public AdminQrController(QrCodeService qrCodeService) {
        this.qrCodeService = qrCodeService;
    }

    @GetMapping(value = "/quiz/{quizId}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> quizQrCode(
        @PathVariable Long quizId,
        @RequestParam(defaultValue = "360") int size,
        @RequestParam(required = false) String baseUrl
    ) {
        byte[] png = qrCodeService.generateQuizQrPng(quizId, size, baseUrl);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES))
            .header("Content-Disposition", "inline; filename=\"quiz-" + quizId + "-qr.png\"")
            .body(png);
    }

    @GetMapping(value = "/question/{questionId}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> questionQrCode(
        @PathVariable Long questionId,
        @RequestParam(defaultValue = "360") int size,
        @RequestParam(required = false) String baseUrl
    ) {
        byte[] png = qrCodeService.generateQuestionQrPng(questionId, size, baseUrl);
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES))
            .header("Content-Disposition", "inline; filename=\"question-" + questionId + "-qr.png\"")
            .body(png);
    }
}
