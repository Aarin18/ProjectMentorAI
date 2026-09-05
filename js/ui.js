/**
 * Purpose: Handles UI interactions, DOM updates, and wiring together all modules.
 * Dependencies: DOM access, validation, storage, scoring, and api modules.
 */

import { validateStudentProfile } from './validation.js';
import { StorageKeys, saveItem, loadItem, removeItem } from './storage.js';
import { analyzeProject, sendMentorMessage } from './api.js';
import { initNavigation } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize nav
  initNavigation();
  
  // Elements
  const form = document.getElementById('profile-form');
  const statusMessage = document.getElementById('status-message');
  
  const ideasSection = document.getElementById('ideas-section');
  const ideasGrid = document.getElementById('idea-grid');
  const ideasLoading = document.getElementById('ideas-loading');
  
  const roadmapSection = document.getElementById('roadmap-section');
  const mentorChatToggle = document.getElementById('mentor-chat-toggle');
  const mentorChatPanel = document.getElementById('mentor-chat-panel');
  const mentorChatClose = document.getElementById('mentor-chat-close');
  const mentorChatForm = document.getElementById('mentor-chat-form');
  const mentorChatInput = document.getElementById('mentor-chat-input');
  const mentorChatMessages = document.getElementById('mentor-chat-messages');
  const generateButton = document.getElementById('generate-ideas-btn');
  let isAnalyzing = false;
  let isChatting = false;

  // Load saved state
  const savedProfile = loadItem(StorageKeys.PROFILE);
  const savedIdeas = loadItem(StorageKeys.IDEAS);
  if (savedProfile) {
    document.getElementById('skills').value = savedProfile.skills || '';
    document.getElementById('interests').value = savedProfile.interests || '';
    document.getElementById('experience').value = savedProfile.experience || '';
    document.getElementById('career-goal').value = savedProfile.careerGoal || '';
    document.getElementById('team-size').value = savedProfile.teamSize || '1';
    document.getElementById('budget').value = savedProfile.budget || '';
    document.getElementById('timeline').value = savedProfile.timeline || '';
  }

  if (savedIdeas) renderAnalysis(savedIdeas);

  mentorChatToggle.addEventListener('click', () => {
    const isOpening = mentorChatPanel.classList.toggle('hidden');
    mentorChatToggle.setAttribute('aria-expanded', String(!isOpening));
    if (isOpening) mentorChatInput.focus();
  });

  mentorChatClose.addEventListener('click', () => {
    mentorChatPanel.classList.add('hidden');
    mentorChatToggle.setAttribute('aria-expanded', 'false');
  });

  mentorChatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = mentorChatInput.value.trim();
    if (!message || isChatting) return;

    isChatting = true;
    addMentorMessage(message, 'user');
    mentorChatInput.value = '';
    const thinkingMessage = addMentorMessage('Thinking...', 'ai');
    mentorChatInput.disabled = true;

    try {
      const profile = loadItem(StorageKeys.PROFILE) || {};
      const analysis = loadItem(StorageKeys.IDEAS) || {};
      const response = await sendMentorMessage(message, {
        projectTitle: analysis.verdict || 'Current Project',
        projectDescription: analysis.summary || analysis.problemAnalysis || '',
        skills: profile.skills || [],
        technology: analysis.recommendedTechStack || [],
        teamSize: profile.teamSize || 1,
        timeline: profile.timeline || '',
        budget: profile.budget || '',
      });
      thinkingMessage.textContent = response;
    } catch (error) {
      thinkingMessage.textContent = error.userMessage || 'Sorry, I couldn\'t connect to the AI mentor right now. Please try again.';
    } finally {
      isChatting = false;
      mentorChatInput.disabled = false;
      mentorChatInput.focus();
    }
  });

  function addMentorMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `mentor-chat-message mentor-chat-message--${sender}`;
    messageElement.textContent = message;
    mentorChatMessages.appendChild(messageElement);
    mentorChatMessages.scrollTop = mentorChatMessages.scrollHeight;
    return messageElement;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isAnalyzing) return;
    hideStatus();

    const rawProfile = {
      skills: document.getElementById('skills').value,
      interests: document.getElementById('interests').value,
      experience: document.getElementById('experience').value,
      careerGoal: document.getElementById('career-goal').value,
      teamSize: parseInt(document.getElementById('team-size').value, 10),
      budget: document.getElementById('budget').value,
      timeline: document.getElementById('timeline').value,
    };

    const validation = validateStudentProfile(rawProfile);
    if (!validation.isValid) {
      showStatus(validation.errors.map(err => err.message).join(' '), 'error');
      return;
    }

    const profile = validation.value;
    isAnalyzing = true;
    generateButton.disabled = true;
    generateButton.textContent = 'Analyzing...';
    saveItem(StorageKeys.PROFILE, profile);

    // Clear previous results
    removeItem(StorageKeys.IDEAS);
    removeItem(StorageKeys.SELECTED_IDEA);
    removeItem(StorageKeys.ROADMAP);
    ideasGrid.innerHTML = '';
    ideasSection.classList.remove('hidden');
    roadmapSection.classList.add('hidden');
    ideasLoading.classList.remove('hidden');
    
    showStatus('Analyzing your project...', 'loading');

    try {
      const analysis = await analyzeProject(profile);
      saveItem(StorageKeys.IDEAS, analysis);
      ideasLoading.classList.add('hidden');
      renderAnalysis(analysis);
      showStatus('Project analysis completed!', 'success');
    } catch (error) {
      ideasLoading.classList.add('hidden');
      ideasSection.classList.add('hidden');
      showStatus(error.userMessage || error.message, 'error');
    } finally {
      isAnalyzing = false;
      generateButton.disabled = false;
      generateButton.textContent = 'Analyze My Project';
    }
  });

  function renderAnalysis(analysis) {
    ideasSection.classList.remove('hidden');
    ideasGrid.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'idea-card idea-card--selected';
    card.innerHTML = `
        <div class="idea-card__header">
          <div class="idea-card__rank">AI Feasibility Analysis</div>
          <h3 class="idea-card__title">${escapeHtml(analysis.verdict)}</h3>
          <p class="idea-card__description">${escapeHtml(analysis.summary)}</p>
        </div>
        <div class="analysis-score" aria-label="Feasibility score ${analysis.feasibilityScore} out of 100">
          <span class="analysis-score__label">Feasibility Score</span>
          <strong>${analysis.feasibilityScore}<small>/100</small></strong>
        </div>
        <dl class="idea-card__details">
          <div class="idea-card__detail">
            <dt>Problem Analysis</dt>
            <dd>${escapeHtml(analysis.problemAnalysis)}</dd>
          </div>
          <div class="idea-card__detail">
            <dt>Technical Difficulty</dt>
            <dd>${escapeHtml(analysis.technicalDifficulty)}</dd>
          </div>
          <div class="idea-card__detail">
            <dt>Estimated Duration</dt>
            <dd>${escapeHtml(analysis.estimatedDuration)}</dd>
          </div>
        </dl>
        <div class="score-panel">
          <h4 class="score-panel__heading"><span>Project plan at a glance</span></h4>
          <dl class="score-list">
            ${renderListRow('Required Skills', analysis.requiredSkills, 'skills')}
            ${renderListRow('Recommended Tech Stack', analysis.recommendedTechStack, 'stack')}
            ${renderListRow('Risks', analysis.risks, 'risks')}
            ${renderListRow('Improvements', analysis.improvements, 'improvements')}
            ${renderListRow('Mentor Advice', analysis.mentorAdvice, 'advice')}
            ${renderListRow('Step-by-step Roadmap', analysis.roadmap, 'roadmap')}
          </dl>
        </div>
      `;

    ideasGrid.appendChild(card);
  }

  function renderListRow(label, values, className) {
    const items = values.map((value) => `<li>${escapeHtml(value)}</li>`).join('');
    return `<div class="score-row score-row--${className}"><dt class="score-row__label">${escapeHtml(label)}</dt><dd class="score-row__value"><ul>${items}</ul></dd></div>`;
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-message--${type}`;
  }

  function hideStatus() {
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
  }

  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
