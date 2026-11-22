import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  ShieldCheck,
  Eye,
  CheckCircle2,
  Clock,
  Inbox,
  Filter,
  Loader2,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type {
  AdminFeedback,
  AdminFeedbackListResponse,
  FeedbackCategory,
  FeedbackStatus,
} from '@/types';

export function FeedbackManagementPage() {
  const { toast } = useToast();

  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [data, setData] = useState<AdminFeedbackListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryId, setCategoryId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [keyword, setKeyword] = useState('');

  // Review Modal
  const [selected, setSelected] = useState<AdminFeedback | null>(null);
  const [modalStatus, setModalStatus] = useState<FeedbackStatus>('REVIEWED');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getFeedbackCategories().then(setCategories).catch(() => {});
  }, []);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listAdminFeedback({
        categoryId,
        status,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        keyword: keyword || undefined,
      });
      setData(res);
    } catch (err) {
      toast({
        title: 'Unable to load feedback',
        description: err instanceof ApiError ? err.message : 'Admin permission required.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [categoryId, status, fromDate, toDate, keyword, toast]);

  useEffect(() => {
    const t = window.setTimeout(loadFeedback, 200);
    return () => window.clearTimeout(t);
  }, [loadFeedback]);

  const openModal = (item: AdminFeedback) => {
    setSelected(item);
    setModalStatus(item.status === 'NEW' ? 'REVIEWED' : item.status);
    setAdminNotes(item.adminNotes || '');
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api.updateFeedbackStatus(selected.id, modalStatus, adminNotes.trim() || undefined);
      toast({
        title: 'Feedback status updated',
        description: `Marked as ${modalStatus}.`,
        variant: 'success',
      });
      setSelected(null);
      loadFeedback();
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof ApiError ? err.message : 'Could not update feedback.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetFilters = () => {
    setCategoryId('ALL');
    setStatus('ALL');
    setFromDate('');
    setToDate('');
    setKeyword('');
  };

  return (
    <AdminLayout
      title="Anonymous Feedback Management"
      subtitle="Admin-only triage inbox for confidential student submissions"
    >
      <div className="space-y-6">
        {/* Anonymity & Access Banner */}
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs sm:text-sm text-blue-900">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Strict Anonymity Enforced:</strong> Feedback records have zero links to student accounts, emails, or IP addresses. Teaching staff are blocked from viewing this module.
          </span>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Total Feedback" value={data?.stats.total ?? 0} icon={Inbox} tone="blue" />
          <MiniStat label="New / Unread" value={data?.stats.newCount ?? 0} icon={Clock} tone="amber" />
          <MiniStat label="Reviewed" value={data?.stats.reviewedCount ?? 0} icon={Eye} tone="sky" />
          <MiniStat label="Resolved" value={data?.stats.resolvedCount ?? 0} icon={CheckCircle2} tone="emerald" />
        </div>

        {/* Filter Controls */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                Filter Anonymous Feedback
              </span>
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>

              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="RESOLVED">Resolved</option>
              </Select>

              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="From date"
              />

              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="To date"
              />

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search subject/message..."
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          ) : data && data.items.length > 0 ? (
            data.items.map((item) => (
              <Card key={item.id} className="hover:border-blue-200 transition-colors">
                <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">{item.categoryName}</Badge>
                      <Badge
                        variant={
                          item.status === 'RESOLVED'
                            ? 'success'
                            : item.status === 'REVIEWED'
                            ? 'outline'
                            : 'warning'
                        }
                      >
                        {item.status}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Submitted {formatDateTime(item.createdAt)}
                      </span>
                    </div>

                    {item.subject && (
                      <h3 className="text-base font-semibold text-slate-900">{item.subject}</h3>
                    )}

                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>

                    {item.adminNotes && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <strong className="text-slate-800">Admin Note: </strong>
                        {item.adminNotes}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex sm:flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => openModal(item)}>
                      Review / Update
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-500">
                No anonymous feedback matches the current filters.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Review / Resolve Modal */}
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Review Anonymous Feedback"
        description={
          selected
            ? `${selected.categoryName} · Submitted ${formatDateTime(selected.createdAt)} · Submitter: Anonymous`
            : undefined
        }
        maxWidthClass="max-w-xl"
      >
        {selected && (
          <form onSubmit={handleSaveStatus} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
              {selected.subject && (
                <p className="text-sm font-semibold text-slate-900">{selected.subject}</p>
              )}
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800">Status</label>
              <Select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as FeedbackStatus)}
              >
                <option value="NEW">New</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="RESOLVED">Resolved</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800">
                Internal Admin Resolution Notes <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Document follow-up actions taken with department or facilities team..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Status'
                )}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </AdminLayout>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'blue' | 'amber' | 'sky' | 'emerald';
}) {
  const styles = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
