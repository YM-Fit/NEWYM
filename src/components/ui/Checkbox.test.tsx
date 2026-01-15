import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('should render checkbox', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Checkbox label="Test Label" />);
    expect(screen.getByLabelText(/test label/i)).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(<Checkbox label="Test" error="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should handle click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox onChange={handleChange} label="Test" />);

    const checkbox = screen.getByLabelText(/test/i);
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be checked when checked prop is true', () => {
    render(<Checkbox checked={true} label="Test" />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Checkbox disabled label="Test" />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
