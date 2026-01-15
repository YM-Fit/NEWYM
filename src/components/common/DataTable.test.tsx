import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';

interface TestItem {
  id: string;
  name: string;
  age: number;
}

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'age', header: 'Age' },
  ];

  const data: TestItem[] = [
    { id: '1', name: 'John', age: 30 },
    { id: '2', name: 'Jane', age: 25 },
  ];

  it('should render table with data', () => {
    render(<DataTable data={data} columns={columns} />);
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('should render empty message when no data', () => {
    render(<DataTable data={[]} columns={columns} />);
    expect(screen.getByText(/אין נתונים להצגה/i)).toBeInTheDocument();
  });

  it('should render custom empty message', () => {
    render(
      <DataTable data={[]} columns={columns} emptyMessage="No items found" />
    );
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const { container } = render(
      <DataTable data={[]} columns={columns} loading={true} />
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should call onRowClick when row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable data={data} columns={columns} onRowClick={onRowClick} />);

    const row = screen.getByText('John').closest('tr');
    if (row) {
      await user.click(row);
      expect(onRowClick).toHaveBeenCalledWith(data[0]);
    }
  });

  it('should render custom cell content', () => {
    const columnsWithRender = [
      {
        key: 'name',
        header: 'Name',
        render: (item: TestItem) => <strong>{item.name.toUpperCase()}</strong>,
      },
      { key: 'age', header: 'Age' },
    ];

    render(<DataTable data={data} columns={columnsWithRender} />);
    expect(screen.getByText('JOHN')).toBeInTheDocument();
  });
});
