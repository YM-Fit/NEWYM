import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  beforeEach(() => {
    // Mock document.body.style
    Object.defineProperty(document.body, 'style', {
      value: {
        overflow: '',
      },
      writable: true,
    });
  });

  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        Content
      </Modal>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        Content
      </Modal>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render with title', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
        Content
      </Modal>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        Content
      </Modal>
    );

    // Find close button by aria-label or by finding X icon
    const closeButton = screen.queryByLabelText(/close|סגור/i) || 
                       screen.getByRole('button', { hidden: true });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        Content
      </Modal>
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render different sizes', () => {
    const { rerender, container } = render(
      <Modal isOpen={true} onClose={vi.fn()} size="sm">
        Content
      </Modal>
    );

    const modal = container.querySelector('[role="dialog"]') || container.querySelector('.max-w-sm');
    expect(modal).toBeInTheDocument();

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} size="lg">
        Content
      </Modal>
    );

    const modalLg = container.querySelector('.max-w-lg');
    expect(modalLg).toBeInTheDocument();
  });

  it('should hide close button when showCloseButton is false', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} showCloseButton={false}>
        Content
      </Modal>
    );

    // Check that X icon button is not present
    const closeButtons = container.querySelectorAll('button');
    const hasCloseButton = Array.from(closeButtons).some(btn => 
      btn.querySelector('svg') || btn.getAttribute('aria-label')?.includes('close')
    );
    expect(hasCloseButton).toBe(false);
  });
});
