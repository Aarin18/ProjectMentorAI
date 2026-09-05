import { describe, expect, it } from 'vitest';
import { validateProjectAnalysis, validateStudentProfile } from '../../js/validation.js';
import { validAnalysis, validProfile } from '../helpers/fixtures.js';

describe('frontend validation', () => {
  it('accepts and normalizes a valid student profile', () => {
    const result = validateStudentProfile({ ...validProfile, skills: '  JavaScript, Node.js  ' });

    expect(result.isValid).toBe(true);
    expect(result.value.skills).toBe('JavaScript, Node.js');
  });

  it.each([
    ['skills', { skills: ' ' }],
    ['interests', { interests: '' }],
    ['experience', { experience: '' }],
    ['career goal', { careerGoal: '' }],
    ['budget', { budget: '' }],
    ['timeline', { timeline: '' }],
    ['team size', { teamSize: 0 }],
  ])('rejects an invalid %s', (_field, override) => {
    const result = validateStudentProfile({ ...validProfile, ...override });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('accepts a complete analysis and rejects incomplete AI data', () => {
    expect(validateProjectAnalysis(validAnalysis).isValid).toBe(true);
    expect(validateProjectAnalysis({ ...validAnalysis, roadmap: [] }).isValid).toBe(false);
  });
});
