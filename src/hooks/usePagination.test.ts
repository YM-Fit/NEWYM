import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  const testData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination(testData));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalItems).toBe(50);
    expect(result.current.totalPages).toBe(3);
  });

  it('should return correct paginated data', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    expect(result.current.paginatedData.length).toBe(10);
    expect(result.current.paginatedData[0].id).toBe(1);
    expect(result.current.paginatedData[9].id).toBe(10);
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedData[0].id).toBe(11);
  });

  it('should navigate to previous page', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10, initialPage: 3 }));

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.currentPage).toBe(2);
  });

  it('should go to specific page', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.paginatedData[0].id).toBe(21);
  });

  it('should not go past last page', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    act(() => {
      result.current.goToPage(100);
    });

    expect(result.current.currentPage).toBe(5);
  });

  it('should not go before first page', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    act(() => {
      result.current.goToPage(0);
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should calculate hasNextPage correctly', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.hasNextPage).toBe(false);
  });

  it('should calculate hasPrevPage correctly', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    expect(result.current.hasPrevPage).toBe(false);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.hasPrevPage).toBe(true);
  });

  it('should calculate startIndex and endIndex correctly', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    expect(result.current.startIndex).toBe(1);
    expect(result.current.endIndex).toBe(10);

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.startIndex).toBe(41);
    expect(result.current.endIndex).toBe(50);
  });

  it('should handle empty data', () => {
    const { result } = renderHook(() => usePagination([]));

    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.paginatedData.length).toBe(0);
  });

  it('should reset to page 1 when pageSize changes', () => {
    const { result } = renderHook(() => usePagination(testData, { initialPageSize: 10 }));

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);

    act(() => {
      result.current.setPageSize(5);
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(5);
  });
});
