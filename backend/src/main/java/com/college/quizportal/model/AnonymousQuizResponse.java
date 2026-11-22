package com.college.quizportal.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Strictly anonymous quiz response record.
 * Decoupled from all user accounts and identifying metadata.
 * Admin endpoints only query aggregate counts from this table.
 */
@Entity
@Table(
    name = "anonymous_quiz_responses",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_anon_resp_question_token",
        columnNames = {"question_id", "token_hash"}
    )
)
public class AnonymousQuizResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "selected_option_id", nullable = false)
    private QuestionOption selectedOption;

    @Column(name = "is_correct", nullable = false)
    private boolean correct;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @PrePersist
    void onCreate() {
        if (submittedAt == null) submittedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Quiz getQuiz() { return quiz; }
    public void setQuiz(Quiz quiz) { this.quiz = quiz; }

    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }

    public QuestionOption getSelectedOption() { return selectedOption; }
    public void setSelectedOption(QuestionOption selectedOption) { this.selectedOption = selectedOption; }

    public boolean isCorrect() { return correct; }
    public void setCorrect(boolean correct) { this.correct = correct; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
}
