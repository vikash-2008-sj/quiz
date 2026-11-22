import type {
  AdminFeedback,
  AdminFeedbackListResponse,
  AdminOption,
  AdminQuestion,
  AdminQuizDetail,
  AdminQuizSummary,
  AnswerResult,
  AuditLog,
  DashboardOverview,
  FeedbackCategory,
  FeedbackConfirmation,
  FeedbackStatus,
  IssueTokenResponse,
  LoginResponse,
  PortalSettings,
  PublicPortalInfo,
  PublicQuestion,
  PublicQuiz,
  QuestionAnalytics,
  QuestionStatus,
  QuizAnalytics,
  QuizStatus,
  UserProfile,
} from '@/types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const TOKEN_STORAGE_KEY = 'cq_portal_jwt';

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (rest.body && !(rest.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const xsrf = readCookie('XSRF-TOKEN');
    if (xsrf) {
      headers['X-XSRF-TOKEN'] = xsrf;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    credentials: skipAuth ? 'same-origin' : 'include',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let fieldErrors: Record<string, string> | undefined;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
      if (data?.fieldErrors) fieldErrors = data.fieldErrors;
    } catch {
      // fallback to status message
    }
    throw new ApiError(message, res.status, fieldErrors);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Public portal info
  getPortalInfo: () => request<PublicPortalInfo>('/public/portal-info', { skipAuth: true }),

  // Auth
  login: async (email: string, password: string) => {
    const data = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },
  getMe: () => request<UserProfile>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Public Student Quiz Portal (includes credentials for anonymous cq_submitted guard cookie, never auth)
  getPublicQuiz: (publicCode: string) =>
    fetch(`${API_BASE}/public/quizzes/${encodeURIComponent(publicCode)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    }).then(handleRawJson<PublicQuiz>),

  getPublicQuestion: (publicCode: string) =>
    fetch(`${API_BASE}/public/questions/${encodeURIComponent(publicCode)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    }).then(handleRawJson<PublicQuestion>),

  issueSubmissionToken: (questionPublicCode: string) =>
    fetch(`${API_BASE}/public/tokens/issue`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ questionPublicCode }),
    }).then(handleRawJson<IssueTokenResponse>),

  submitAnswer: (questionPublicCode: string, selectedOptionId: number, submissionToken: string) =>
    fetch(`${API_BASE}/public/questions/${encodeURIComponent(questionPublicCode)}/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ selectedOptionId, submissionToken }),
    }).then(handleRawJson<AnswerResult>),

  // Public Anonymous Feedback (zero auth, zero cookies sent)
  getFeedbackCategories: () =>
    fetch(`${API_BASE}/public/feedback/categories`, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    }).then(handleRawJson<FeedbackCategory[]>),

  submitAnonymousFeedback: (payload: { categoryId: number; subject?: string; message: string }) =>
    fetch(`${API_BASE}/public/feedback`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }).then(handleRawJson<FeedbackConfirmation>),

  // Admin Quizzes & Questions
  listQuizzes: (params?: { status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.search?.trim()) qs.set('search', params.search.trim());
    const query = qs.toString();
    return request<AdminQuizSummary[]>(`/admin/quizzes${query ? `?${query}` : ''}`);
  },
  getQuiz: (id: number) => request<AdminQuizDetail>(`/admin/quizzes/${id}`),
  createQuiz: (payload: {
    title: string;
    description?: string;
    courseCode?: string;
    department?: string;
    status?: QuizStatus;
    startsAt?: string | null;
    endsAt?: string | null;
  }) =>
    request<AdminQuizDetail>('/admin/quizzes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateQuiz: (
    id: number,
    payload: {
      title: string;
      description?: string;
      courseCode?: string;
      department?: string;
      status?: QuizStatus;
      startsAt?: string | null;
      endsAt?: string | null;
    }
  ) =>
    request<AdminQuizDetail>(`/admin/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateQuizStatus: (id: number, status: QuizStatus) =>
    request<AdminQuizDetail>(`/admin/quizzes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteQuiz: (id: number) =>
    request<{ message: string }>(`/admin/quizzes/${id}`, { method: 'DELETE' }),

  addQuestion: (
    quizId: number,
    payload: {
      questionText: string;
      explanation?: string;
      orderIndex?: number;
      status?: QuestionStatus;
      options: AdminOption[];
    }
  ) =>
    request<AdminQuestion>(`/admin/quizzes/${quizId}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateQuestion: (
    questionId: number,
    payload: {
      questionText: string;
      explanation?: string;
      orderIndex?: number;
      status?: QuestionStatus;
      options: AdminOption[];
    }
  ) =>
    request<AdminQuestion>(`/admin/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateQuestionStatus: (questionId: number, status: QuestionStatus) =>
    request<AdminQuestion>(`/admin/questions/${questionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteQuestion: (questionId: number) =>
    request<{ message: string }>(`/admin/questions/${questionId}`, { method: 'DELETE' }),

  // Admin Analytics (aggregate only)
  getDashboardOverview: () => request<DashboardOverview>('/admin/analytics/overview'),
  getQuizAnalytics: (quizId: number) => request<QuizAnalytics>(`/admin/analytics/quizzes/${quizId}`),
  getQuestionAnalytics: (questionId: number) =>
    request<QuestionAnalytics>(`/admin/analytics/questions/${questionId}`),

  // Admin Anonymous Feedback Management (ADMIN ONLY)
  listAdminFeedback: (params?: {
    categoryId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    keyword?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.categoryId && params.categoryId !== 'ALL') qs.set('categoryId', params.categoryId);
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.fromDate) qs.set('fromDate', params.fromDate);
    if (params?.toDate) qs.set('toDate', params.toDate);
    if (params?.keyword?.trim()) qs.set('keyword', params.keyword.trim());
    const query = qs.toString();
    return request<AdminFeedbackListResponse>(`/admin/feedback${query ? `?${query}` : ''}`);
  },
  updateFeedbackStatus: (id: number, status: FeedbackStatus, adminNotes?: string) =>
    request<AdminFeedback>(`/admin/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNotes }),
    }),

  // Admin Settings & Audit Logs (ADMIN ONLY)
  getSettings: () => request<PortalSettings>('/admin/settings'),
  updateSettings: (payload: Omit<PortalSettings, 'updatedAt'>) =>
    request<PortalSettings>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getAuditLogs: (limit = 35) => request<AuditLog[]>(`/admin/audit-logs?limit=${limit}`),
};

async function handleRawJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let fieldErrors: Record<string, string> | undefined;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
      if (data?.fieldErrors) fieldErrors = data.fieldErrors;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, fieldErrors);
  }
  return res.json() as Promise<T>;
}
