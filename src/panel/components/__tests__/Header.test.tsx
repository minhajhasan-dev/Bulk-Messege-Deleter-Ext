import { render, screen } from '@testing-library/react';
import Header from '../Header';
import { useAppStore } from '@/panel/state/store';

describe('Header', () => {
  it('renders title', () => {
    // init state
    useAppStore.setState({ license: { status: 'trial', daysLeft: 3 } });
    render(<Header />);
    expect(screen.getByText(/Side Panel Toolkit/)).toBeInTheDocument();
    expect(screen.getByText(/Trial/)).toBeInTheDocument();
  });
});
