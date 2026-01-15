import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('should render card with children', () => {
    const { getByText } = render(<Card>Test Content</Card>);
    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('should render different variants', () => {
    const { rerender, container } = render(<Card variant="default">Content</Card>);
    expect(container.firstChild).toHaveClass('bg-zinc-900');

    rerender(<Card variant="glass">Content</Card>);
    expect(container.firstChild).toHaveClass('glass-card');

    rerender(<Card variant="premium">Content</Card>);
    expect(container.firstChild).toHaveClass('premium-card');
  });

  it('should render different padding sizes', () => {
    const { rerender, container } = render(<Card padding="none">Content</Card>);
    expect(container.firstChild).not.toHaveClass('p-');

    rerender(<Card padding="sm">Content</Card>);
    expect(container.firstChild).toHaveClass('p-3');

    rerender(<Card padding="lg">Content</Card>);
    expect(container.firstChild).toHaveClass('p-8');
  });

  it('should apply hover styles when hover is true', () => {
    const { container } = render(<Card hover>Content</Card>);
    expect(container.firstChild).toHaveClass('hover:shadow-2xl');
  });
});
