import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (page: number) => void;
  showItemCount?: boolean;
  compact?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  hasNextPage,
  hasPrevPage,
  onNextPage,
  onPrevPage,
  onGoToPage,
  showItemCount = true,
  compact = false,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = compact ? 3 : 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4" dir="rtl">
      {showItemCount && (
        <div className="text-sm text-zinc-400">
          מציג {startIndex}-{endIndex} מתוך {totalItems}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onGoToPage(1)}
          disabled={!hasPrevPage}
          className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="לעמוד הראשון"
        >
          <ChevronsRight className="h-4 w-4 text-zinc-400" />
        </button>

        <button
          onClick={onPrevPage}
          disabled={!hasPrevPage}
          className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="עמוד קודם"
        >
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        </button>

        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-zinc-500">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onGoToPage(page)}
                className={`min-w-[36px] h-9 rounded-lg font-medium transition-all ${
                  currentPage === page
                    ? 'bg-emerald-500 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="עמוד הבא"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-400" />
        </button>

        <button
          onClick={() => onGoToPage(totalPages)}
          disabled={!hasNextPage}
          className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="לעמוד האחרון"
        >
          <ChevronsLeft className="h-4 w-4 text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
