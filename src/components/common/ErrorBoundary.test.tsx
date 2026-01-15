import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import React from 'react';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error message when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/שגיאה|error/i)).toBeInTheDocument();
  });

  it('should show retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/retry|נסה שוב/i)).toBeInTheDocument();
  });

  it('should allow retry after error', () => {
    const TestWrapper = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    const { rerender } = render(<TestWrapper shouldThrow={true} />);

    expect(screen.getByText(/שגיאה|error/i)).toBeInTheDocument();

    // Click retry button - this will reset the error state
    const retryButton = screen.getByText(/נסה שוב|retry/i);
    retryButton.click();

    // After clicking retry, render without error
    rerender(<TestWrapper shouldThrow={false} />);

    // The component should now render without error
    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});
