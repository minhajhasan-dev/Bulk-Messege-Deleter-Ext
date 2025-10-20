import { describe, it, expect } from 'vitest';
import { isLikelyMyMessage } from './authorship';

describe('authorship heuristics', () => {
  it('detects by aria-label', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-label', 'You: hello');
    expect(isLikelyMyMessage(el)).toBe(true);
  });

  it('detects by class name', () => {
    const el = document.createElement('div');
    el.className = 'message outgoing self';
    expect(isLikelyMyMessage(el)).toBe(true);
  });

  it('detects by data-testid', () => {
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'mw_message_row outgoing');
    expect(isLikelyMyMessage(el)).toBe(true);
  });

  it('falls back to false when unknown', () => {
    const el = document.createElement('div');
    el.textContent = 'hello there';
    expect(isLikelyMyMessage(el)).toBe(false);
  });
});
