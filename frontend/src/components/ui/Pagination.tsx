'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const nums = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return start + i;
  }).filter((p) => p >= 1 && p <= totalPages);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white text-sm text-gray-500">
      <span>
        {total === 0
          ? 'No records'
          : `Showing ${from}–${to} of ${total.toLocaleString()}`}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        {totalPages > 1 && nums.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 py-1 rounded-lg text-xs border transition-colors ${
              p === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}

        {totalPages <= 1 && (
          <span className="px-3 py-1 text-xs text-gray-400">
            {totalPages === 0 ? '0 pages' : 'Page 1 of 1'}
          </span>
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
