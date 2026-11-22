package com.college.quizportal.service;

import com.college.quizportal.model.Question;
import com.college.quizportal.model.Quiz;
import com.college.quizportal.repository.QuestionRepository;
import com.college.quizportal.repository.QuizRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

@Service
public class QrCodeService {

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final SettingsService settingsService;

    public QrCodeService(QuizRepository quizRepository,
                         QuestionRepository questionRepository,
                         SettingsService settingsService) {
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.settingsService = settingsService;
    }

    public byte[] generateQuizQrPng(Long quizId, int size, String customBaseUrl) {
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));
        String baseUrl = resolveBaseUrl(customBaseUrl);
        return renderPng(baseUrl + "/quiz/" + quiz.getPublicCode(), size);
    }

    public byte[] generateQuestionQrPng(Long questionId, int size, String customBaseUrl) {
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        String baseUrl = resolveBaseUrl(customBaseUrl);
        return renderPng(baseUrl + "/q/" + question.getPublicCode(), size);
    }

    private String resolveBaseUrl(String customBaseUrl) {
        if (customBaseUrl != null && !customBaseUrl.isBlank()) {
            String trimmed = customBaseUrl.trim();
            if ((trimmed.startsWith("http://") || trimmed.startsWith("https://")) && trimmed.length() <= 300) {
                while (trimmed.endsWith("/")) {
                    trimmed = trimmed.substring(0, trimmed.length() - 1);
                }
                return trimmed;
            }
        }
        return settingsService.getPublicBaseUrl();
    }

    private byte[] renderPng(String content, int requestedSize) {
        int safeSize = Math.max(180, Math.min(requestedSize, 800));
        try {
            QRCodeWriter writer = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = Map.of(
                EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                EncodeHintType.MARGIN, 2,
                EncodeHintType.CHARACTER_SET, "UTF-8"
            );
            BitMatrix bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, safeSize, safeSize, hints);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException | IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate QR code");
        }
    }
}
