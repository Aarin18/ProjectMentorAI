/**
 * Purpose: Handles UI interactions, DOM updates, and wiring together all modules.
 * Dependencies: DOM access, validation, storage, scoring, and api modules.
 */

import { validateStudentProfile } from './validation.js';
import { StorageKeys, saveItem, loadItem, removeItem } from './storage.js';
import { analyzeProject } from './api.js';
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

  // Load saved state
  const savedProfile = loadItem(StorageKeys.PROFILE);
  const savedIdeas = loadItem(StorageKeys.IDEAS);
  if (savedProfile) {
    document.getElementById('skills').value = savedProfile.skills || '';
    document.getElementById('interests').value = savedProfile.interests || '';
    document.getElementById('experience').value = savedProfile.experience || '';
    document.getElementById('career-goal').value = savedProfile.careerGoal || '';
    document.getElementById('team-size').value = savedProfile.teamSize || '1';
    document.getElementById('timeline').value = savedProfile.timeline || '';
  }

  if (savedIdeas) renderAnalysis(savedIdeas);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatus();

    const rawProfile = {
      skills: document.getElementById('skills').value,
      interests: document.getElementById('interests').value,
      experience: document.getElementById('experience').value,
      careerGoal: document.getElementById('career-goal').value,
      teamSize: parseInt(document.getElementById('team-size').value, 10),
      timeline: document.getElementById('timeline').value,
    };

    const validation = validateStudentProfile(rawProfile);
    if (!validation.isValid) {
      showStatus(validation.errors.map(err => err.message).join(' '), 'error');
      return;
    }

    const profile = validation.value;
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
    }
  });

  function renderAnalysis(analysis) {
    ideasSection.classList.remove('hidden');
    ideasGrid.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'idea-card idea-card--selected';
    card.innerHTML = `
        <div class="idea-card__header">
          <div class="idea-card__rank">Feasibility Score</div>
          <h3 class="idea-card__title">${escapeHtml(analysis.verdict)}</h3>
          <p class="idea-card__description">${escapeHtml(analysis.summary)}</p>
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
          <h4 class="score-panel__heading">
            <span>Project Feasibility</span>
            <span class="score-panel__overall">${analysis.feasibilityScore}%</span>
          </h4>
          <dl class="score-list">
            ${renderListRow('Required Skills', analysis.requiredSkills)}
            ${renderListRow('Recommended Stack', analysis.recommendedTechStack)}
            ${renderListRow('Risks', analysis.risks)}
            ${renderListRow('Improvements', analysis.improvements)}
            ${renderListRow('Mentor Advice', analysis.mentorAdvice)}
            ${renderListRow('Roadmap', analysis.roadmap)}
          </dl>
        </div>
      `;

    ideasGrid.appendChild(card);
  }

  function renderListRow(label, values) {
    return `<div class="score-row"><dt class="score-row__label">${escapeHtml(label)}</dt><dd class="score-row__value">${escapeHtml(values.join(', '))}</dd></div>`;
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
