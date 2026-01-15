import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    startIndex: 1,
    endIndex: 10,
    hasNextPage: true,
    hasPrevPage: false,
    onNextPage: vi.fn(),
    onPrevPage: vi.fn(),
    onGoToPage: vi.fn(),
  };

  it('should not render when totalPages is 1', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={1} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render pagination controls', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByLabelText(/לעמוד הראשון/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/עמוד הבא/i)).toBeInTheDocument();
  });

  it('should call onNextPage when next button is clicked', async () => {
    const user = userEvent.setup();
    const onNextPage = vi.fn();
    render(<Pagination {...defaultProps} onNextPage={onNextPage} />);

    const nextButton = screen.getByLabelText(/עמוד הבא/i);
    await user.click(nextButton);

    expect(onNextPage).toHaveBeenCalledTimes(1);
  });

  it('should call onPrevPage when prev button is clicked', async () => {
    const user = userEvent.setup();
    const onPrevPage = vi.fn();
    render(
      <Pagination {...defaultProps} currentPage={2} hasPrevPage={true} onPrevPage={onPrevPage} />
    );

    const prevButton = screen.getByLabelText(/עמוד קודם/i);
    await user.click(prevButton);

    expect(onPrevPage).toHaveBeenCalledTimes(1);
  });

  it('should call onGoToPage when page number is clicked', async () => {
    const user = userEvent.setup();
    const onGoToPage = vi.fn();
    render(<Pagination {...defaultProps} onGoToPage={onGoToPage} />);

    const pageButton = screen.getByText('2');
    await user.click(pageButton);

    expect(onGoToPage).toHaveBeenCalledWith(2);
  });

  it('should disable prev button when hasPrevPage is false', () => {
    render(<Pagination {...defaultProps} hasPrevPage={false} />);
    const prevButton = screen.getByLabelText(/עמוד קודם/i);
    expect(prevButton).toBeDisabled();
  });

  it('should show item count when showItemCount is true', () => {
    render(<Pagination {...defaultProps} showItemCount={true} />);
    expect(screen.getByText(/מציג/i)).toBeInTheDocument();
  });

  it('should hide item count when showItemCount is false', () => {
    render(<Pagination {...defaultProps} showItemCount={false} />);
    expect(screen.queryByText(/מציג/i)).not.toBeInTheDocument();
  });
});
