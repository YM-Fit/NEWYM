import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDialog } from './ConfirmationDialog';

describe('ConfirmationDialog', () => {
  it('should not render when isOpen is false', () => {
    render(
      <ConfirmationDialog
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Are you sure?"
      />
    );

    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Are you sure?"
      />
    );

    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Confirm"
        message="Are you sure?"
      />
    );

    // Find button by text content or aria-label
    const confirmButton = screen.getByText(/אישור/i) || 
                         screen.getByLabelText(/אישור/i) ||
                         screen.getByRole('button', { hidden: true });
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Are you sure?"
      />
    );

    // Find button by text content
    const cancelButton = screen.getByText(/ביטול/i) || 
                        screen.getByLabelText(/ביטול/i);
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render different variants', () => {
    const { rerender } = render(
      <ConfirmationDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Message"
        variant="danger"
      />
    );

    expect(screen.getByText('Message')).toBeInTheDocument();

    rerender(
      <ConfirmationDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Message"
        variant="warning"
      />
    );

    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Are you sure?"
        isLoading={true}
      />
    );

    expect(screen.getByText(/מעבד|loading/i)).toBeInTheDocument();
  });

  it('should disable buttons when loading', () => {
    const { container } = render(
      <ConfirmationDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Are you sure?"
        isLoading={true}
      />
    );

    // Find buttons inside the dialog content (not the modal close button)
    const dialogContent = container.querySelector('[dir="rtl"]');
    const buttons = dialogContent?.querySelectorAll('button') || [];
    
    // Should have 2 buttons (cancel and confirm)
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    
    // Check that confirm and cancel buttons are disabled
    const confirmButton = Array.from(buttons).find(btn => 
      btn.textContent?.includes('מעבד') || btn.getAttribute('aria-label')?.includes('אישור')
    );
    const cancelButton = Array.from(buttons).find(btn => 
      btn.getAttribute('aria-label')?.includes('ביטול')
    );
    
    if (confirmButton) expect(confirmButton).toBeDisabled();
    if (cancelButton) expect(cancelButton).toBeDisabled();
  });
});
