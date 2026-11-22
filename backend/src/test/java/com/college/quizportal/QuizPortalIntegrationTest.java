package com.college.quizportal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QuizPortalIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String loginAndGetToken(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("token").asText();
    }

    @Test
    void authenticationAndRbacPermissionsWorkAsExpected() throws Exception {
        // Unauthenticated requests to admin endpoints fail with 401
        mockMvc.perform(get("/api/admin/quizzes")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/feedback")).andExpect(status().isUnauthorized());

        // Bad password returns 401
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "email", "admin@college.edu",
                    "password", "WrongPassword123"
                ))))
            .andExpect(status().isUnauthorized());

        // Staff can view quizzes and analytics, but CANNOT access anonymous feedback or settings
        String staffToken = loginAndGetToken("staff@college.edu", "TestStaff!2026");

        mockMvc.perform(get("/api/admin/quizzes")
                .header("Authorization", "Bearer " + staffToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/analytics/overview")
                .header("Authorization", "Bearer " + staffToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pendingFeedbackCount").doesNotExist())
            .andExpect(jsonPath("$.totalFeedbackCount").doesNotExist());

        mockMvc.perform(get("/api/admin/feedback")
                .header("Authorization", "Bearer " + staffToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/settings")
                .header("Authorization", "Bearer " + staffToken))
            .andExpect(status().isForbidden());

        // Admin CAN access feedback and settings
        String adminToken = loginAndGetToken("admin@college.edu", "TestAdmin!2026");
        mockMvc.perform(get("/api/admin/feedback")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.stats").exists());

        mockMvc.perform(get("/api/admin/settings")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.collegeName").isNotEmpty());
    }

    @Test
    void fullQuizLifecycleAnswerHidingDuplicatePreventionAndExactAnalytics() throws Exception {
        String adminToken = loginAndGetToken("admin@college.edu", "TestAdmin!2026");

        // 1. Admin creates a DRAFT quiz
        MvcResult createQuizRes = mockMvc.perform(post("/api/admin/quizzes")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "title", "SE401: Software Architecture Check",
                    "description", "Integration test quiz",
                    "courseCode", "SE401",
                    "department", "Computer Science"
                ))))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode createdQuiz = objectMapper.readTree(createQuizRes.getResponse().getContentAsString());
        long quizId = createdQuiz.get("id").asLong();
        String quizPublicCode = createdQuiz.get("publicCode").asText();

        // 2. Admin adds an MCQ question with 4 options and an explanation
        MvcResult createQuestionRes = mockMvc.perform(post("/api/admin/quizzes/" + quizId + "/questions")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "questionText", "Which HTTP status code indicates a duplicate resource conflict?",
                    "explanation", "HTTP 409 Conflict indicates the request conflicts with the current server state.",
                    "status", "ACTIVE",
                    "options", List.of(
                        Map.of("optionLabel", "A", "optionText", "200 OK", "correct", false),
                        Map.of("optionLabel", "B", "optionText", "401 Unauthorized", "correct", false),
                        Map.of("optionLabel", "C", "optionText", "409 Conflict", "correct", true),
                        Map.of("optionLabel", "D", "optionText", "502 Bad Gateway", "correct", false)
                    )
                ))))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode createdQuestion = objectMapper.readTree(createQuestionRes.getResponse().getContentAsString());
        long questionId = createdQuestion.get("id").asLong();
        String questionPublicCode = createdQuestion.get("publicCode").asText();
        long wrongOptionId = createdQuestion.get("options").get(0).get("id").asLong();
        long correctOptionId = createdQuestion.get("options").get(2).get("id").asLong();

        // Draft quiz must not be publicly readable yet
        mockMvc.perform(get("/api/public/questions/" + questionPublicCode))
            .andExpect(status().isForbidden());

        // 3. Admin publishes quiz
        mockMvc.perform(patch("/api/admin/quizzes/" + quizId + "/status")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", "PUBLISHED"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PUBLISHED"));

        // 4. Verify QR PNG generation for both quiz and question
        MvcResult quizQr = mockMvc.perform(get("/api/admin/qr/quiz/" + quizId)
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.IMAGE_PNG))
            .andReturn();
        assertThat(quizQr.getResponse().getContentAsByteArray().length).isGreaterThan(200);

        MvcResult qQr = mockMvc.perform(get("/api/admin/qr/question/" + questionId)
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.IMAGE_PNG))
            .andReturn();
        assertThat(qQr.getResponse().getContentAsByteArray().length).isGreaterThan(200);

        // 5. Public question fetch MUST NOT expose correct answer or explanation
        MvcResult publicQRes = mockMvc.perform(get("/api/public/questions/" + questionPublicCode))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.quizPublicCode").value(quizPublicCode))
            .andReturn();
        String publicPayload = publicQRes.getResponse().getContentAsString();
        assertThat(publicPayload).doesNotContain("correct");
        assertThat(publicPayload).doesNotContain("explanation");
        assertThat(publicPayload).doesNotContain("HTTP 409 Conflict indicates");

        // 6. Student #1 issues one-time token & submits CORRECT answer
        String token1 = issueToken(questionPublicCode);
        MvcResult submit1 = mockMvc.perform(post("/api/public/questions/" + questionPublicCode + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "selectedOptionId", correctOptionId,
                    "submissionToken", token1
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.correct").value(true))
            .andExpect(jsonPath("$.correctOptionId").value(correctOptionId))
            .andExpect(jsonPath("$.correctOptionLabel").value("C"))
            .andExpect(jsonPath("$.explanation").value("HTTP 409 Conflict indicates the request conflicts with the current server state."))
            .andReturn();

        // 7. Replaying token1 MUST fail with 409 Conflict
        mockMvc.perform(post("/api/public/questions/" + questionPublicCode + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "selectedOptionId", correctOptionId,
                    "submissionToken", token1
                ))))
            .andExpect(status().isConflict());

        // 8. Browser cookie guard also prevents issuing a second token for the same question
        Cookie submittedCookie = submit1.getResponse().getCookie("cq_submitted");
        assertThat(submittedCookie).isNotNull();
        mockMvc.perform(post("/api/public/tokens/issue")
                .cookie(submittedCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("questionPublicCode", questionPublicCode))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.alreadySubmitted").value(true));

        // 9. Student #2 submits CORRECT answer, Student #3 submits WRONG answer
        String token2 = issueToken(questionPublicCode);
        mockMvc.perform(post("/api/public/questions/" + questionPublicCode + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "selectedOptionId", correctOptionId,
                    "submissionToken", token2
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.correct").value(true));

        String token3 = issueToken(questionPublicCode);
        mockMvc.perform(post("/api/public/questions/" + questionPublicCode + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "selectedOptionId", wrongOptionId,
                    "submissionToken", token3
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.correct").value(false))
            .andExpect(jsonPath("$.correctOptionId").value(correctOptionId));

        // 10. Verify Admin Aggregate Analytics math & absence of PII / individual rows
        MvcResult analyticsRes = mockMvc.perform(get("/api/admin/analytics/quizzes/" + quizId)
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalSubmissions").value(3))
            .andExpect(jsonPath("$.correctCount").value(2))
            .andExpect(jsonPath("$.incorrectCount").value(1))
            .andExpect(jsonPath("$.accuracyPercentage").value(66.67))
            .andExpect(jsonPath("$.questionAnalytics[0].optionStats[0].responseCount").value(1))
            .andExpect(jsonPath("$.questionAnalytics[0].optionStats[0].percentage").value(33.33))
            .andExpect(jsonPath("$.questionAnalytics[0].optionStats[2].responseCount").value(2))
            .andExpect(jsonPath("$.questionAnalytics[0].optionStats[2].percentage").value(66.67))
            .andReturn();

        String analyticsJson = analyticsRes.getResponse().getContentAsString();
        assertThat(analyticsJson).doesNotContain("tokenHash");
        assertThat(analyticsJson).doesNotContain("studentName");
        assertThat(analyticsJson).doesNotContain("rollNumber");
        assertThat(analyticsJson).doesNotContain("ipAddress");
    }

    @Test
    void anonymousFeedbackSubmissionFilteringAndAdminResolution() throws Exception {
        // Load public categories without authentication
        MvcResult catRes = mockMvc.perform(get("/api/public/feedback/categories"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode cats = objectMapper.readTree(catRes.getResponse().getContentAsString());
        assertThat(cats.size()).isGreaterThanOrEqualTo(7);
        long firstCatId = cats.get(0).get("id").asLong();

        // Submit anonymous feedback with XSS attempt (sanitized server-side) and NO auth header
        mockMvc.perform(post("/api/public/feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "categoryId", firstCatId,
                    "subject", "Wi-Fi reliability <script>alert(1)</script> in Block C",
                    "message", "The campus Wi-Fi drops frequently during afternoon lab evaluations in Block C."
                ))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.categoryName").isNotEmpty())
            .andExpect(jsonPath("$.id").doesNotExist());

        // Admin views, filters, and resolves the feedback
        String adminToken = loginAndGetToken("admin@college.edu", "TestAdmin!2026");
        MvcResult listRes = mockMvc.perform(get("/api/admin/feedback")
                .param("categoryId", String.valueOf(firstCatId))
                .param("keyword", "Block C")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode items = objectMapper.readTree(listRes.getResponse().getContentAsString()).get("items");
        assertThat(items.size()).isEqualTo(1);
        JsonNode fb = items.get(0);
        assertThat(fb.get("subject").asText()).doesNotContain("<script>");
        assertThat(fb.has("userId")).isFalse();
        assertThat(fb.has("ipAddress")).isFalse();

        long fbId = fb.get("id").asLong();
        mockMvc.perform(patch("/api/admin/feedback/" + fbId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "status", "RESOLVED",
                    "adminNotes", "Network team upgraded Block C access point."
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RESOLVED"))
            .andExpect(jsonPath("$.reviewedAt").isNotEmpty());
    }

    private String issueToken(String questionPublicCode) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/public/tokens/issue")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("questionPublicCode", questionPublicCode))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.alreadySubmitted").value(false))
            .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).get("submissionToken").asText();
    }
}
