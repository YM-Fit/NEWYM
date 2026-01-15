import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('should render input', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Input label="Test Label" />);
    expect(screen.getByLabelText(/test label/i)).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(<Input label="Test" error="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should show hint message', () => {
    render(<Input label="Test" hint="Hint message" />);
    expect(screen.getByText('Hint message')).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    render(<Input type="password" showPasswordToggle label="Password" />);

    const input = screen.getByLabelText(/password/i);
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show|הצג/i });
    await user.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');
  });

  it('should handle input changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} label="Test" />);

    const input = screen.getByLabelText(/test/i);
    await user.type(input, 'test value');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should show required indicator', () => {
    render(<Input label="Test" required />);
    expect(screen.getByLabelText(/test/i)).toBeRequired();
  });

  it('should show success state', () => {
    render(<Input label="Test" success />);
    const label = screen.getByText(/test/i);
    expect(label).toHaveClass('text-emerald-400');
  });
});
