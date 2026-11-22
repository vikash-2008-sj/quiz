package com.college.quizportal.config;

import com.college.quizportal.model.*;
import com.college.quizportal.repository.*;
import com.college.quizportal.service.CryptoTokenService;
import com.college.quizportal.service.SettingsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

/**
 * Seeds initial portal settings, admin/staff accounts, sample quizzes, aggregate anonymous responses,
 * and sample anonymous feedback when the database is empty.
 * Never hardcodes credentials: reads initial passwords from environment variables or generates one-time
 * random bootstrap passwords logged once at first startup.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${app.seed.admin-email:admin@college.edu}")
    private String adminEmail;

    @Value("${app.seed.admin-password:}")
    private String adminPassword;

    @Value("${app.seed.staff-email:staff@college.edu}")
    private String staffEmail;

    @Value("${app.seed.staff-password:}")
    private String staffPassword;

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final QuizRepository quizRepository;
    private final AnonymousQuizResponseRepository responseRepository;
    private final FeedbackCategoryRepository categoryRepository;
    private final FeedbackRepository feedbackRepository;
    private final SettingsService settingsService;
    private final CryptoTokenService cryptoTokenService;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(RoleRepository roleRepository,
                      UserRepository userRepository,
                      QuizRepository quizRepository,
                      AnonymousQuizResponseRepository responseRepository,
                      FeedbackCategoryRepository categoryRepository,
                      FeedbackRepository feedbackRepository,
                      SettingsService settingsService,
                      CryptoTokenService cryptoTokenService,
                      PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.quizRepository = quizRepository;
        this.responseRepository = responseRepository;
        this.categoryRepository = categoryRepository;
        this.feedbackRepository = feedbackRepository;
        this.settingsService = settingsService;
        this.cryptoTokenService = cryptoTokenService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        settingsService.getOrCreateSettings();

        if (!seedEnabled) {
            return;
        }

        User adminUser = seedUsers();
        if (quizRepository.count() == 0 && adminUser != null) {
            seedSampleQuizzes(adminUser);
        }
        if (feedbackRepository.count() == 0) {
            seedSampleFeedback();
        }
    }

    private User seedUsers() {
        Role adminRole = roleRepository.findByName(RoleName.ADMIN)
            .orElseThrow(() -> new IllegalStateException("ADMIN role missing from Flyway migration"));
        Role staffRole = roleRepository.findByName(RoleName.STAFF)
            .orElseThrow(() -> new IllegalStateException("STAFF role missing from Flyway migration"));

        User admin = userRepository.findByEmailIgnoreCase(adminEmail).orElseGet(() -> {
            boolean generated = (adminPassword == null || adminPassword.isBlank());
            String rawPassword = generated ? generateBootstrapPassword() : adminPassword;

            User u = new User();
            u.setEmail(adminEmail.trim().toLowerCase());
            u.setPasswordHash(passwordEncoder.encode(rawPassword));
            u.setFullName("Dr. Kavitha Subramanian");
            u.setDepartment("Academic Administration");
            u.setRole(adminRole);
            u.setActive(true);
            User saved = userRepository.save(u);

            if (generated) {
                log.warn("=================================================================");
                log.warn("INITIAL ADMIN ACCOUNT CREATED (SEED_ADMIN_PASSWORD not set):");
                log.warn("  Email   : {}", saved.getEmail());
                log.warn("  Password: {}", rawPassword);
                log.warn("Set SEED_ADMIN_PASSWORD in .env or change password in Settings.");
                log.warn("=================================================================");
            } else {
                log.info("Seeded initial ADMIN account: {}", saved.getEmail());
            }
            return saved;
        });

        userRepository.findByEmailIgnoreCase(staffEmail).orElseGet(() -> {
            boolean generated = (staffPassword == null || staffPassword.isBlank());
            String rawPassword = generated ? generateBootstrapPassword() : staffPassword;

            User u = new User();
            u.setEmail(staffEmail.trim().toLowerCase());
            u.setPasswordHash(passwordEncoder.encode(rawPassword));
            u.setFullName("Prof. Rajesh Menon");
            u.setDepartment("Computer Science & Engineering");
            u.setRole(staffRole);
            u.setActive(true);
            User saved = userRepository.save(u);

            if (generated) {
                log.warn("INITIAL STAFF ACCOUNT CREATED -> Email: {} | Password: {}", saved.getEmail(), rawPassword);
            } else {
                log.info("Seeded initial STAFF account: {}", saved.getEmail());
            }
            return saved;
        });

        return admin;
    }

    private void seedSampleQuizzes(User creator) {
        Quiz q1 = new Quiz();
        q1.setPublicCode("qz-cs201dsa");
        q1.setTitle("CS201: Data Structures & Algorithms — Live Lecture Check");
        q1.setDescription("Quick conceptual MCQ checkpoint on time complexity, trees, and hash tables.");
        q1.setCourseCode("CS201");
        q1.setDepartment("Computer Science & Engineering");
        q1.setStatus(QuizStatus.PUBLISHED);
        q1.setCreatedBy(creator);

        Question q1m1 = buildQuestion(q1, "qn-dsa10001", 1,
            "What is the worst-case time complexity of searching for a key in a balanced Binary Search Tree (AVL tree) with n nodes?",
            "An AVL tree maintains a height balance factor of -1, 0, or +1 at every node, keeping tree height bounded by O(log n).",
            List.of(
                new OptSpec("A", "O(1)", false),
                new OptSpec("B", "O(log n)", true),
                new OptSpec("C", "O(n)", false),
                new OptSpec("D", "O(n log n)", false)
            ));

        Question q1m2 = buildQuestion(q1, "qn-dsa10002", 2,
            "Which data structure follows the Last-In, First-Out (LIFO) principle and is used to manage function call frames?",
            "The runtime call stack pushes a new activation record on function call and pops it when the function returns.",
            List.of(
                new OptSpec("A", "Queue", false),
                new OptSpec("B", "Linked List", false),
                new OptSpec("C", "Stack", true),
                new OptSpec("D", "Priority Heap", false)
            ));

        Question q1m3 = buildQuestion(q1, "qn-dsa10003", 3,
            "Which traversal of a Binary Search Tree always visits nodes in ascending sorted order?",
            "In-order traversal visits Left subtree, then Root, then Right subtree, producing sorted keys for any valid BST.",
            List.of(
                new OptSpec("A", "In-order traversal", true),
                new OptSpec("B", "Pre-order traversal", false),
                new OptSpec("C", "Post-order traversal", false),
                new OptSpec("D", "Level-order traversal", false)
            ));

        q1.getQuestions().addAll(List.of(q1m1, q1m2, q1m3));
        Quiz savedQ1 = quizRepository.save(q1);

        // Seed aggregate anonymous responses for realistic initial analytics charts
        seedAnonymousCounts(savedQ1, savedQ1.getQuestions().get(0), new int[]{2, 18, 4, 1});
        seedAnonymousCounts(savedQ1, savedQ1.getQuestions().get(1), new int[]{3, 2, 19, 1});
        seedAnonymousCounts(savedQ1, savedQ1.getQuestions().get(2), new int[]{16, 4, 3, 2});

        Quiz q2 = new Quiz();
        q2.setPublicCode("qz-db302sql");
        q2.setTitle("CS302: Relational Databases & Normalization");
        q2.setDescription("Verify understanding of ACID transactions, indexing, and normal forms.");
        q2.setCourseCode("CS302");
        q2.setDepartment("Information Technology");
        q2.setStatus(QuizStatus.PUBLISHED);
        q2.setCreatedBy(creator);

        Question q2m1 = buildQuestion(q2, "qn-db300001", 1,
            "Which ACID property ensures that a database transaction executes completely or leaves no partial effects on failure?",
            "Atomicity guarantees all-or-nothing execution: if any statement in a transaction fails, the entire transaction rolls back.",
            List.of(
                new OptSpec("A", "Atomicity", true),
                new OptSpec("B", "Isolation", false),
                new OptSpec("C", "Durability", false),
                new OptSpec("D", "Consistency", false)
            ));

        Question q2m2 = buildQuestion(q2, "qn-db300002", 2,
            "A relation is in Second Normal Form (2NF) if it is in 1NF and has no:",
            "2NF eliminates partial functional dependencies of non-prime attributes on a proper subset of any candidate key.",
            List.of(
                new OptSpec("A", "Multi-valued attributes", false),
                new OptSpec("B", "Partial dependencies on a composite key", true),
                new OptSpec("C", "Foreign key constraints", false),
                new OptSpec("D", "Primary keys", false)
            ));

        q2.getQuestions().addAll(List.of(q2m1, q2m2));
        Quiz savedQ2 = quizRepository.save(q2);

        seedAnonymousCounts(savedQ2, savedQ2.getQuestions().get(0), new int[]{14, 2, 1, 3});
        seedAnonymousCounts(savedQ2, savedQ2.getQuestions().get(1), new int[]{4, 11, 2, 1});

        Quiz q3 = new Quiz();
        q3.setPublicCode("qz-os204drf");
        q3.setTitle("CS204: Operating Systems — CPU Scheduling");
        q3.setDescription("Draft quiz scheduled for next week's tutorial session.");
        q3.setCourseCode("CS204");
        q3.setDepartment("Computer Science & Engineering");
        q3.setStatus(QuizStatus.DRAFT);
        q3.setCreatedBy(creator);

        Question q3m1 = buildQuestion(q3, "qn-os200001", 1,
            "Which CPU scheduling algorithm assigns a fixed time quantum to each process in a cyclic queue?",
            "Round Robin scheduling allocates a fixed time slice (quantum) per ready process in FIFO order.",
            List.of(
                new OptSpec("A", "Shortest Job First", false),
                new OptSpec("B", "First-Come, First-Served", false),
                new OptSpec("C", "Round Robin", true),
                new OptSpec("D", "Priority Non-Preemptive", false)
            ));

        q3.getQuestions().add(q3m1);
        quizRepository.save(q3);
    }

    private void seedAnonymousCounts(Quiz quiz, Question question, int[] optionDistribution) {
        List<QuestionOption> options = question.getOptions();
        for (int i = 0; i < Math.min(options.size(), optionDistribution.length); i++) {
            QuestionOption opt = options.get(i);
            for (int c = 0; c < optionDistribution[i]; c++) {
                AnonymousQuizResponse resp = new AnonymousQuizResponse();
                resp.setQuiz(quiz);
                resp.setQuestion(question);
                resp.setSelectedOption(opt);
                resp.setCorrect(opt.isCorrect());
                resp.setTokenHash(cryptoTokenService.hashSubmissionToken(cryptoTokenService.generateOneTimeSubmissionToken()));
                responseRepository.save(resp);
            }
        }
    }

    private void seedSampleFeedback() {
        createFeedback("laboratories", "Update Linux IDEs in Systems Lab 2",
            "Several workstations in Systems Lab 2 are missing updated Java 17 and VS Code extensions needed for weekly lab assessments. Updating the base lab image would help students complete assignments smoothly.",
            FeedbackStatus.NEW, null);

        createFeedback("teaching-quality", "More live coding walkthroughs in Algorithms",
            "The lecture slides are very clear, and adding 10 minutes of step-by-step live tracing for graph algorithms would make complex topics much easier to grasp before exams.",
            FeedbackStatus.REVIEWED, "Shared aggregate theme with CSE curriculum committee.");

        createFeedback("classrooms", "Projector contrast in Lecture Hall B-204",
            "During afternoon lectures, sunlight makes the projector screen in B-204 difficult to read from the back three rows. Window blinds or a brighter bulb would really improve visibility.",
            FeedbackStatus.NEW, null);

        createFeedback("college-facilities", "Extend central library hours before end-semester exams",
            "Keeping the reading hall open until 10:00 PM during the two weeks leading up to semester exams would greatly support hostel and day-scholar students.",
            FeedbackStatus.RESOLVED, "Library committee approved extended reading room timings through finals.");
    }

    private void createFeedback(String categorySlug, String subject, String message, FeedbackStatus status, String notes) {
        categoryRepository.findBySlug(categorySlug).ifPresent(cat -> {
            Feedback f = new Feedback();
            f.setCategory(cat);
            f.setSubject(subject);
            f.setMessage(message);
            f.setStatus(status);
            f.setAdminNotes(notes);
            if (status != FeedbackStatus.NEW) {
                f.setReviewedAt(java.time.Instant.now());
            }
            feedbackRepository.save(f);
        });
    }

    private Question buildQuestion(Quiz quiz, String publicCode, int order, String text, String explanation, List<OptSpec> specs) {
        Question q = new Question();
        q.setQuiz(quiz);
        q.setPublicCode(publicCode);
        q.setOrderIndex(order);
        q.setQuestionText(text);
        q.setExplanation(explanation);
        q.setStatus(QuestionStatus.ACTIVE);

        int idx = 1;
        for (OptSpec spec : specs) {
            QuestionOption opt = new QuestionOption();
            opt.setQuestion(q);
            opt.setOptionLabel(spec.label);
            opt.setOptionText(spec.text);
            opt.setCorrect(spec.correct);
            opt.setOrderIndex(idx++);
            q.getOptions().add(opt);
        }
        return q;
    }

    private String generateBootstrapPassword() {
        byte[] bytes = new byte[12];
        new SecureRandom().nextBytes(bytes);
        return "Cq!" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private record OptSpec(String label, String text, boolean correct) {}
}
