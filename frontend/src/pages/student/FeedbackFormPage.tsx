import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Info, Send, Loader2, Lock } from 'lucide-react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import type { FeedbackCategory, PublicPortalInfo } from '@/types';

export function FeedbackFormPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [portalInfo, setPortalInfo] = useState<PublicPortalInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [categoryId, setCategoryId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getFeedbackCategories(), api.getPortalInfo()])
      .then(([cats, info]) => {
        setCategories(cats);
        setPortalInfo(info);
        if (cats.length > 0) setCategoryId(String(cats[0].id));
      })
      .catch(() => {
        setError('Unable to load feedback categories. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please enter at least 10 characters so administrators can understand your feedback.');
      return;
    }

    setSubmitting(true);
    try {
      const confirmation = await api.submitAnonymousFeedback({
        categoryId: Number(categoryId),
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      navigate('/feedback/confirmation', { state: confirmation, replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit feedback right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find((c) => String(c.id) === categoryId);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Privacy Guarantee Header */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-semibold">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <span>100% Login-Free Anonymous Feedback Portal</span>
          </div>
          <p className="text-xs sm:text-sm text-blue-800/90 leading-relaxed">
            No student account, email, roll number, cookies, or IP address are stored with your submission.
            Only authorized college administrators can review submissions — teaching staff cannot access feedback records.
          </p>
        </div>

        {portalInfo && !portalInfo.allowAnonymousFeedback ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Lock className="mx-auto h-10 w-10 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">Feedback Submissions Paused</h2>
              <p className="text-sm text-slate-600">
                The college administration has temporarily paused new anonymous feedback submissions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Submit Anonymous College Feedback</CardTitle>
              <CardDescription>
                Share suggestions, concerns, or appreciation about academics, teaching quality, laboratories, classrooms, facilities, or management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-semibold text-slate-800">
                    Feedback Category <span className="text-red-500">*</span>
                  </label>
                  <Select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={loading}
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                  {selectedCategory?.description && (
                    <p className="text-xs text-slate-500">{selectedCategory.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-semibold text-slate-800">
                    Subject <span className="text-xs font-normal text-slate-400">(Optional)</span>
                  </label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    placeholder="e.g., Lab workstation software, Classroom projector clarity..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="message" className="text-sm font-semibold text-slate-800">
                      Your Feedback <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-slate-400">{message.length} / 4000</span>
                  </div>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    maxLength={4000}
                    required
                    placeholder="Describe your feedback clearly and constructively. Please avoid including your own name or roll number to stay anonymous."
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || loading}
                  className="w-full h-11 font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting Anonymously...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Anonymous Feedback
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Honest Privacy Limitations Disclosure */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Privacy Scope &amp; Infrastructure Notice</span>
          </div>
          <p>
            {portalInfo?.privacyNotice ||
              'This application collects zero student identities, accounts, cookies, or IP addresses in its feedback records. However, external network infrastructure (such as campus Wi-Fi, reverse proxies, firewalls, or hosting provider logs) may record network traffic metadata outside this application.'}
          </p>
        </div>
      </div>
    </StudentLayout>
  );
}
