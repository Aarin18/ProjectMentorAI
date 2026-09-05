import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeProject, sendMentorMessage } from '../js/api.js';
import { validAnalysis, validProfile } from './helpers/fixtures.js';

const response = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body),
});

describe('frontend API module', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('posts a project profile and returns validated analysis', async () => {
    fetch.mockResolvedValue(response(validAnalysis));

    await expect(analyzeProject(validProfile)).resolves.toEqual(validAnalysis);
    expect(fetch).toHaveBeenCalledWith('/api/analyze-project', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(validProfile),
    }));
  });

  it('surfaces API errors without exposing implementation details', async () => {
    fetch.mockResolvedValue(response({ error: 'Service unavailable.' }, false, 503));

    await expect(analyzeProject(validProfile)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      userMessage: 'Service unavailable.',
    });
  });

  it('posts chatbot messages with context and returns the response', async () => {
    fetch.mockResolvedValue(response({ response: 'Build the smallest useful version first.' }));

    await expect(sendMentorMessage('How do I start?', { projectTitle: 'Planner' }))
      .resolves.toBe('Build the smallest useful version first.');
    expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ message: 'How do I start?', projectContext: { projectTitle: 'Planner' } }),
    }));
  });

  it('rejects an invalid chatbot response', async () => {
    fetch.mockResolvedValue(response({ error: 'Please enter a question.' }, false, 400));

    await expect(sendMentorMessage('', {})).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      userMessage: 'Please enter a question.',
    });
  });
});
