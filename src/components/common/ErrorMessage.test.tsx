import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage', () => {
  it('should render error message', () => {
    render(<ErrorMessage message="Error occurred" />);
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('should render with title', () => {
    render(<ErrorMessage title="Error Title" message="Error message" />);
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should render different variants', () => {
    const { rerender } = render(
      <ErrorMessage message="Error" variant="error" />
    );
    expect(screen.getByText('Error')).toBeInTheDocument();

    rerender(<ErrorMessage message="Warning" variant="warning" />);
    expect(screen.getByText('Warning')).toBeInTheDocument();

    rerender(<ErrorMessage message="Info" variant="info" />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('should dismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ErrorMessage message="Error message" />);

    const closeButton = screen.getByRole('button', { name: /סגור|close/i });
    await user.click(closeButton);

    expect(screen.queryByText('Error message')).not.toBeInTheDocument();
  });

  it('should call onDismiss callback', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorMessage message="Error" onDismiss={onDismiss} />);

    const closeButton = screen.getByRole('button', { name: /סגור|close/i });
    await user.click(closeButton);

    expect(onDismiss).toHaveBeenCalled();
  });
});
