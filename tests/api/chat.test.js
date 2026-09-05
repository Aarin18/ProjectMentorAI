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

describe('POST /api/chat', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-only-placeholder';
    generateContentMock.mockReset();
    generateContentMock.mockResolvedValue({ text: 'Start with a small working prototype.' });
  });

  it('accepts a message and project context and returns an AI response', async () => {
    const response = await request(app).post('/api/chat').send({
      message: 'How should I scope the first version?',
      projectContext: { projectTitle: 'Study planner', teamSize: 2 },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ response: 'Start with a small working prototype.' });
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing or blank message', async () => {
    const response = await request(app).post('/api/chat').send({ message: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/enter a question/i);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('returns a safe error when Gemini is unavailable', async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await request(app).post('/api/chat').send({ message: 'Help me test this.' });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('AI analysis is temporarily unavailable. Please try again later.');
    expect(JSON.stringify(response.body)).not.toContain('test-only-placeholder');
  });
});
