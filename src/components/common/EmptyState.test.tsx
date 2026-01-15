import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';
import { Inbox } from 'lucide-react';

describe('EmptyState', () => {
  it('should render with title and description', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="There are no items to display"
      />
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('There are no items to display')).toBeInTheDocument();
  });

  it('should render action button when provided', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Description"
        action={{
          label: 'Add Item',
          onClick: handleAction,
        }}
      />
    );

    const button = screen.getByRole('button', { name: /add item/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('should render minimal variant', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Description"
        variant="minimal"
      />
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('should render default variant', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Description"
        variant="default"
      />
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
  });
});
