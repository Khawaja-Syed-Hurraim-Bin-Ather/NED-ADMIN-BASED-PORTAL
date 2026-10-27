import { describe, it, expect } from 'vitest';
import { THEME, cn, Button, Input, Card, Badge, Alert, Modal, DisclaimerBanner } from './index';

describe('@educompass/ui design system', () => {
  it('exports THEME with required colors and disclaimer notice', () => {
    expect(THEME.colors.brand).toBeDefined();
    expect(THEME.colors.brand[500]).toBe('#0e87eb');
    expect(THEME.disclaimer.notice).toContain('Guidance estimates, not official university decisions');
    expect(THEME.disclaimer.termsUrl).toBe('/terms');
  });

  it('provides cn utility that merges classes cleanly', () => {
    const result = cn('bg-red-500', 'text-white', false && 'hidden', 'bg-blue-500');
    expect(result).toBe('text-white bg-blue-500');
  });

  it('exports all core UI components', () => {
    expect(Button).toBeDefined();
    expect(Input).toBeDefined();
    expect(Card).toBeDefined();
    expect(Badge).toBeDefined();
    expect(Alert).toBeDefined();
    expect(Modal).toBeDefined();
    expect(DisclaimerBanner).toBeDefined();
  });
});
