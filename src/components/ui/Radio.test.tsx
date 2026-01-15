import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio } from './Radio';

describe('Radio', () => {
  it('should render radio button', () => {
    render(<Radio label="Test Option" />);
    expect(screen.getByRole('radio')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Radio label="Test Option" id="test-radio" />);
    expect(screen.getByLabelText(/test option/i)).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(<Radio label="Test" error="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should handle click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Radio label="Test" id="test-radio" onChange={handleChange} />);

    const radio = screen.getByRole('radio');
    await user.click(radio);

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be checked when checked prop is true', () => {
    render(<Radio checked={true} label="Test" />);
    expect(screen.getByRole('radio')).toBeChecked();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Radio disabled label="Test" />);
    expect(screen.getByRole('radio')).toBeDisabled();
  });
});
