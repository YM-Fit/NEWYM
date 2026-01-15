import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
  ];

  it('should render select', () => {
    render(<Select options={options} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Select label="Test Label" options={options} />);
    expect(screen.getByLabelText(/test label/i)).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(<Select label="Test" error="Error message" options={options} />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should render options', () => {
    render(<Select options={options} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('should handle selection', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Select options={options} onChange={handleChange} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '2');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should show placeholder', () => {
    render(<Select options={options} placeholder="Select option" />);
    expect(screen.getByText('Select option')).toBeInTheDocument();
  });

  it('should disable options when disabled', () => {
    const optionsWithDisabled = [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2', disabled: true },
    ];
    render(<Select options={optionsWithDisabled} />);
    
    const select = screen.getByRole('combobox');
    const option2 = screen.getByText('Option 2');
    expect(option2).toBeDisabled();
  });

  it('should show required indicator', () => {
    render(<Select label="Test" required options={options} />);
    expect(screen.getByLabelText(/test/i)).toBeRequired();
  });
});
