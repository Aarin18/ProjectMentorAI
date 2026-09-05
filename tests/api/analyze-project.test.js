import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {
      this.models = { generateContent: generateContentMock };
    }
  },
  Type: {
    OBJECT: 'object',
    INTEGER: 'integer',
    STRING: 'string',
    ARRAY: 'array',
  },
}));

import { app } from '../../server.js';
import { validAnalysis, validProfile } from '../helpers/fixtures.js';

describe('POST /api/analyze-project', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-only-placeholder';
    generateContentMock.mockReset();
    generateContentMock.mockResolvedValue({ text: JSON.stringify(validAnalysis) });
  });

  it('returns the complete validated analysis structure', async () => {
    const response = await request(app).post('/api/analyze-project').send(validProfile);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(validAnalysis);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing or incomplete profile without calling Gemini', async () => {
    const response = await request(app).post('/api/analyze-project').send({
      ...validProfile,
      skills: '   ',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/fill out all profile fields/i);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('returns a safe service error when the Gemini key is unavailable', async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await request(app).post('/api/analyze-project').send(validProfile);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'AI analysis is temporarily unavailable. Please try again later.',
    });
    expect(JSON.stringify(response.body)).not.toContain('GEMINI_API_KEY');
  });

  it('handles malformed JSON with a 400 response', async () => {
    const response = await request(app)
      .post('/api/analyze-project')
      .set('Content-Type', 'application/json')
      .send('{"skills":');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body.');
  });
});
