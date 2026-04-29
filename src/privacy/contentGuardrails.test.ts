import { describe, expect, it } from 'vitest';
import { assessCaptureContent, formatGuardrailMatchLabels } from './contentGuardrails';

describe('assessCaptureContent', () => {
  it('allows ordinary workflow notes', () => {
    const result = assessCaptureContent({
      summaryShort: 'Checked in at station and reviewed lifting setup.',
      tagsText: 'mobility, follow-up',
    });

    expect(result.hasBlockedContent).toBe(false);
    expect(result.hasSensitiveContent).toBe(false);
  });

  it('blocks family medical history and genetic information', () => {
    const result = assessCaptureContent({
      summaryShort: 'Employee mentioned family medical history and a genetic test.',
      tagsText: '',
    });

    expect(result.hasBlockedContent).toBe(true);
    expect(formatGuardrailMatchLabels(result.blockedMatches)).toContain(
      'family medical history',
    );
    expect(formatGuardrailMatchLabels(result.blockedMatches)).toContain('genetic information');
  });

  it('warns but does not block diagnosis-like language', () => {
    const result = assessCaptureContent({
      summaryShort: 'Employee described a diagnosis and medication change.',
      tagsText: '',
    });

    expect(result.hasBlockedContent).toBe(false);
    expect(result.hasSensitiveContent).toBe(true);
  });
});
