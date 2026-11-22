-- College Quiz & Anonymous Feedback Portal - Initial Schema Migration (MySQL 8.0)
-- Strict separation between authenticated staff/admin identities and anonymous student data.

CREATE TABLE roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    department VARCHAR(120),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    role_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_active ON users(active);

CREATE TABLE quizzes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    public_code VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    course_code VARCHAR(60),
    department VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    starts_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quizzes_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_quizzes_status ON quizzes(status);
CREATE INDEX idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX idx_quizzes_created_at ON quizzes(created_at);

CREATE TABLE questions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    public_code VARCHAR(32) NOT NULL UNIQUE,
    question_text TEXT NOT NULL,
    explanation TEXT,
    order_index INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_order ON questions(quiz_id, order_index);

CREATE TABLE options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    option_label VARCHAR(10) NOT NULL,
    option_text VARCHAR(500) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT uq_options_question_label UNIQUE (question_id, option_label)
);

CREATE INDEX idx_options_question_id ON options(question_id);

-- Privacy-preserving one-time submission tokens: zero user identity, zero IP address.
CREATE TABLE submission_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    CONSTRAINT fk_submission_tokens_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX idx_submission_tokens_question ON submission_tokens(question_id);
CREATE INDEX idx_submission_tokens_expires ON submission_tokens(expires_at);

-- Anonymous quiz responses: strictly decoupled from user identities, accounts, and IPs.
CREATE TABLE anonymous_quiz_responses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_option_id BIGINT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anon_resp_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    CONSTRAINT fk_anon_resp_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_anon_resp_option FOREIGN KEY (selected_option_id) REFERENCES options(id) ON DELETE CASCADE,
    CONSTRAINT uq_anon_resp_question_token UNIQUE (question_id, token_hash)
);

CREATE INDEX idx_anon_resp_quiz ON anonymous_quiz_responses(quiz_id);
CREATE INDEX idx_anon_resp_question ON anonymous_quiz_responses(question_id);
CREATE INDEX idx_anon_resp_option ON anonymous_quiz_responses(selected_option_id);
CREATE INDEX idx_anon_resp_submitted_at ON anonymous_quiz_responses(submitted_at);

CREATE TABLE feedback_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Anonymous student feedback: NO user_id, NO student_id, NO ip_address, NO user_agent.
CREATE TABLE feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT NOT NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    admin_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    CONSTRAINT fk_feedback_category FOREIGN KEY (category_id) REFERENCES feedback_categories(id)
);

CREATE INDEX idx_feedback_category_id ON feedback(category_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);

CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id BIGINT NULL,
    actor_email VARCHAR(190),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60),
    entity_id VARCHAR(64),
    details VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE portal_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    college_name VARCHAR(200) NOT NULL,
    portal_title VARCHAR(200) NOT NULL,
    public_base_url VARCHAR(300) NOT NULL,
    allow_anonymous_feedback BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit_per_minute INT NOT NULL DEFAULT 60,
    privacy_notice TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed core roles and feedback categories via migration
INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Full college portal administrator with quiz, analytics, feedback, and settings access'),
    ('STAFF', 'Faculty member with quiz management and aggregate analytics access; strictly excluded from anonymous feedback');

INSERT INTO feedback_categories (name, slug, description, active) VALUES
    ('Teaching Staff', 'teaching-staff', 'Feedback regarding faculty conduct, mentorship, and responsiveness', TRUE),
    ('Teaching Quality', 'teaching-quality', 'Feedback on lectures, clarity, pacing, and teaching methodology', TRUE),
    ('Academics', 'academics', 'Curriculum, exams, grading fairness, labs syllabus, and academic schedules', TRUE),
    ('Classrooms', 'classrooms', 'Classroom seating, audio-visual equipment, ventilation, and cleanliness', TRUE),
    ('Laboratories', 'laboratories', 'Lab equipment, software availability, safety, and practical sessions', TRUE),
    ('College Facilities', 'college-facilities', 'Library, Wi-Fi, canteen, hostels, restrooms, and campus amenities', TRUE),
    ('Management', 'management', 'Administration, student services, policies, and campus communication', TRUE),
    ('Other', 'other', 'Any other college-related suggestion, concern, or appreciation', TRUE);
