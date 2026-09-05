// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { validAnalysis } from './helpers/fixtures.js';

const pageMarkup = `
  <nav class="app-header__nav"><a class="nav-link"></a><a class="nav-link"></a><a class="nav-link"></a></nav>
  <section id="about-section"></section>
  <section id="profile-section"></section>
  <section id="roadmap-section" class="hidden"></section>
  <form id="profile-form">
    <input id="skills" value="JavaScript">
    <input id="interests" value="Education">
    <textarea id="experience">Built web apps</textarea>
    <input id="career-goal" value="Engineer">
    <input id="team-size" value="2">
    <input id="budget" value="Free tools">
    <input id="timeline" value="8 weeks">
    <div id="status-message"></div>
    <button id="generate-ideas-btn" type="submit">Analyze My Project</button>
  </form>
  <section id="ideas-section" class="hidden"><div id="idea-grid"></div><div id="ideas-loading" class="hidden"></div></section>
  <div id="roadmap-loading" class="hidden"></div><div id="roadmap-container"></div>
  <button id="mentor-chat-toggle" type="button"></button>
  <section id="mentor-chat-panel" class="hidden">
    <button id="mentor-chat-close" type="button"></button>
    <div id="mentor-chat-messages"></div>
    <form id="mentor-chat-form"><input id="mentor-chat-input"><button type="submit">Send</button></form>
  </section>
`;

describe('browser workflows', () => {
  beforeAll(async () => {
    document.body.innerHTML = pageMarkup;
    globalThis.IntersectionObserver = class {
      observe() {}
    };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => validAnalysis })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ response: 'Build one feature at a time.' }) });

    await import('../js/ui.js?ui-workflow-test');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('shows loading, renders analysis, and sends a chatbot message', async () => {
    const form = document.getElementById('profile-form');
    const generateButton = document.getElementById('generate-ideas-btn');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(generateButton.disabled).toBe(true);
    expect(document.getElementById('ideas-loading').classList.contains('hidden')).toBe(false);

    await vi.waitFor(() => expect(document.getElementById('idea-grid').textContent).toContain(validAnalysis.verdict));
    expect(generateButton.disabled).toBe(false);
    expect(document.getElementById('status-message').textContent).toContain('completed');

    document.getElementById('mentor-chat-toggle').click();
    const chatInput = document.getElementById('mentor-chat-input');
    chatInput.value = 'How should I start?';
    document.getElementById('mentor-chat-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(document.getElementById('mentor-chat-messages').textContent)
      .toContain('Build one feature at a time.'));
    expect(fetch).toHaveBeenLastCalledWith('/api/chat', expect.any(Object));
  });
});
