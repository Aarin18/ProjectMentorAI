import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../server.js';

describe('application health', () => {
  it('serves the frontend at GET /', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('ProjectMentor AI');
  });
});
