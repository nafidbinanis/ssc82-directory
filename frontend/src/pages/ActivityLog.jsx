import { useEffect, useState } from 'react';
import { PlusCircle, Pencil, Trash2, UploadCloud } from 'lucide-react';
import api from '../lib/api';
import Pagination from '../components/Pagination';

const ACTION_META = {
  CREATE: { icon: PlusCircle, color: 'text-forest-600 bg-forest-50', label: 'Added' },
  UPDATE: { icon: Pencil, color: 'text-amber-600 bg-amber-50', label: 'Edited' },
  DELETE: { icon: Trash2, color: 'text-brick-500 bg-brick-50', label: 'Deleted' },
  IMPORT: { icon: UploadCloud, color: 'text-ink-500 bg-parchment-100', label: 'Imported' },
};

export default function ActivityLog() {
  const [result, setResult] = useState({ data: [], pagination: { total: 0, total_pages: 1, page: 1, page_size: 20 } });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/activity', { params: { page, page_size: 20 } })
      .then((res) => setResult(res.data))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-forest-500 font-medium mb-1">Audit trail</p>
        <h1 className="font-display text-3xl font-semibold text-ink-900">Activity Log</h1>
        <p className="text-sm text-ink-400 mt-1">Every record added, edited, deleted, or imported into the directory.</p>
      </div>

      <div className="bg-white border border-ink-400/10 rounded-lg shadow-sm divide-y divide-ink-400/8">
        {loading && <p className="p-6 text-sm text-ink-400">Loading…</p>}
        {!loading && result.data.length === 0 && <p className="p-6 text-sm text-ink-400">No activity recorded yet.</p>}
        {result.data.map((entry) => {
          const meta = ACTION_META[entry.action] || ACTION_META.IMPORT;
          const Icon = meta.icon;
          return (
            <div key={entry.id} className="flex items-start gap-3 p-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-800">
                  <span className="font-medium">{meta.label}</span>
                  {entry.person_name ? <> — {entry.person_name}</> : null}
                </p>
                <p className="text-xs text-ink-400 mt-0.5">
                  by {entry.performed_by_name || 'Unknown'} · {entry.created_at}
                  {entry.details?.message ? <> · {entry.details.message}</> : null}
                </p>
              </div>
              <span className="text-xs font-mono text-ink-400 shrink-0">Total: {entry.total_records_after}</span>
            </div>
          );
        })}
      </div>

      <Pagination
        page={result.pagination.page}
        totalPages={result.pagination.total_pages}
        total={result.pagination.total}
        pageSize={result.pagination.page_size}
        onChange={setPage}
      />
    </div>
  );
}
