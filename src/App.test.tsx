import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('App', () => {
  it('renders heading', () => {
    render(<App />);
    expect(screen.getByText(/Bulk Message Deleter/i)).toBeInTheDocument();
  });
});
