export type RoleName = 'ADMIN' | 'STAFF';
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type QuestionStatus = 'ACTIVE' | 'CLOSED';
export type FeedbackStatus = 'NEW' | 'REVIEWED' | 'RESOLVED';

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  department: string | null;
  role: RoleName;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface PublicPortalInfo {
  collegeName: string;
  portalTitle: string;
  allowAnonymousFeedback: boolean;
  privacyNotice: string;
}

export interface AdminOption {
  id?: number;
  optionLabel: string;
  optionText: string;
  correct: boolean;
  orderIndex?: number;
}

export interface AdminQuestion {
  id: number;
  quizId: number;
  publicCode: string;
  shareUrl: string;
  questionText: string;
  explanation: string | null;
  orderIndex: number;
  status: QuestionStatus;
  submissionCount: number;
  options: AdminOption[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuizSummary {
  id: number;
  publicCode: string;
  shareUrl: string;
  title: string;
  description: string | null;
  courseCode: string | null;
  department: string | null;
  status: QuizStatus;
  startsAt: string | null;
  endsAt: string | null;
  questionCount: number;
  totalSubmissions: number;
  accuracyPercentage: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuizDetail {
  id: number;
  publicCode: string;
  shareUrl: string;
  title: string;
  description: string | null;
  courseCode: string | null;
  department: string | null;
  status: QuizStatus;
  startsAt: string | null;
  endsAt: string | null;
  totalSubmissions: number;
  createdByName: string;
  questions: AdminQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicOption {
  id: number;
  optionLabel: string;
  optionText: string;
  orderIndex: number;
}

export interface PublicQuestion {
  id: number;
  publicCode: string;
  quizId: number;
  quizPublicCode: string;
  quizTitle: string;
  courseCode: string | null;
  department: string | null;
  questionText: string;
  status: QuestionStatus;
  quizStatus: QuizStatus;
  orderIndex: number;
  alreadySubmitted: boolean;
  options: PublicOption[];
}

export interface PublicQuiz {
  id: number;
  publicCode: string;
  title: string;
  description: string | null;
  courseCode: string | null;
  department: string | null;
  status: QuizStatus;
  questions: PublicQuestion[];
}

export interface IssueTokenResponse {
  submissionToken: string | null;
  alreadySubmitted: boolean;
  expiresAt: string | null;
}

export interface AnswerResult {
  questionId: number;
  questionPublicCode: string;
  selectedOptionId: number;
  correct: boolean;
  correctOptionId: number;
  correctOptionLabel: string;
  correctOptionText: string;
  explanation: string | null;
  submittedAt: string;
}

export interface OptionStat {
  optionId: number;
  optionLabel: string;
  optionText: string;
  correct: boolean;
  responseCount: number;
  percentage: number;
}

export interface QuestionAnalytics {
  questionId: number;
  publicCode: string;
  questionText: string;
  status: QuestionStatus;
  orderIndex: number;
  totalSubmissions: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercentage: number;
  optionStats: OptionStat[];
}

export interface QuizAnalytics {
  quizId: number;
  publicCode: string;
  title: string;
  courseCode: string | null;
  department: string | null;
  status: QuizStatus;
  totalQuestions: number;
  totalSubmissions: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercentage: number;
  questionAnalytics: QuestionAnalytics[];
}

export interface QuizComparison {
  quizId: number;
  title: string;
  courseCode: string | null;
  status: QuizStatus;
  totalSubmissions: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercentage: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface DashboardOverview {
  totalQuizzes: number;
  publishedQuizzes: number;
  totalQuestions: number;
  totalSubmissions: number;
  totalCorrectSubmissions: number;
  totalIncorrectSubmissions: number;
  overallAccuracyPercentage: number;
  pendingFeedbackCount: number | null;
  totalFeedbackCount: number | null;
  quizComparisons: QuizComparison[];
  feedbackByCategory: CategoryCount[];
}

export interface FeedbackCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface FeedbackConfirmation {
  categoryName: string;
  submittedAt: string;
  message: string;
}

export interface AdminFeedback {
  id: number;
  categoryId: number;
  categoryName: string;
  subject: string | null;
  message: string;
  status: FeedbackStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export interface AdminFeedbackListResponse {
  stats: {
    total: number;
    newCount: number;
    reviewedCount: number;
    resolvedCount: number;
  };
  items: AdminFeedback[];
}

export interface PortalSettings {
  collegeName: string;
  portalTitle: string;
  publicBaseUrl: string;
  allowAnonymousFeedback: boolean;
  rateLimitPerMinute: number;
  privacyNotice: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}
