import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render spinner', () => {
    render(<LoadingSpinner />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render with text', () => {
    render(<LoadingSpinner text="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render different sizes', () => {
    const { rerender, container } = render(<LoadingSpinner size="sm" />);
    expect(container.querySelector('.h-4')).toBeInTheDocument();

    rerender(<LoadingSpinner size="lg" />);
    expect(container.querySelector('.h-12')).toBeInTheDocument();
  });

  it('should render different variants', () => {
    const { rerender, container } = render(<LoadingSpinner variant="spinner" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    rerender(<LoadingSpinner variant="dots" />);
    expect(container.querySelector('.animate-bounce')).toBeInTheDocument();

    rerender(<LoadingSpinner variant="pulse" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    rerender(<LoadingSpinner variant="ring" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render full screen when fullScreen is true', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    expect(container.querySelector('.fixed')).toBeInTheDocument();
  });
});
