/**
 * Purpose: Handles UI interactions, DOM updates, and wiring together all modules.
 * Dependencies: DOM access, validation, storage, scoring, and api modules.
 */

import { validateStudentProfile, validateSelectedIdea } from './validation.js';
import { StorageKeys, saveItem, loadItem, removeItem } from './storage.js';
import { scoreProjectIdea } from './scoring.js';
import { generateProjectIdeas, generateMentorRoadmap } from './api.js';
import { initNavigation } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize nav
  initNavigation();
  
  // Elements
  const form = document.getElementById('profile-form');
  const apiKeyInput = document.getElementById('api-key');
  const statusMessage = document.getElementById('status-message');
  
  const ideasSection = document.getElementById('ideas-section');
  const ideasGrid = document.getElementById('idea-grid');
  const ideasLoading = document.getElementById('ideas-loading');
  
  const roadmapSection = document.getElementById('roadmap-section');
  const roadmapContainer = document.getElementById('roadmap-container');
  const roadmapLoading = document.getElementById('roadmap-loading');

  // Load saved state
  const savedProfile = loadItem(StorageKeys.PROFILE);
  const savedIdeas = loadItem(StorageKeys.IDEAS);
  const savedSelectedIdea = loadItem(StorageKeys.SELECTED_IDEA);
  const savedRoadmap = loadItem(StorageKeys.ROADMAP);
  const savedApiKey = loadItem(StorageKeys.API_KEY);

  if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
  }

  if (savedProfile) {
    document.getElementById('skills').value = savedProfile.skills || '';
    document.getElementById('interests').value = savedProfile.interests || '';
    document.getElementById('experience').value = savedProfile.experience || '';
    document.getElementById('career-goal').value = savedProfile.careerGoal || '';
    document.getElementById('team-size').value = savedProfile.teamSize || '1';
    document.getElementById('timeline').value = savedProfile.timeline || '';
  }

  if (savedIdeas) {
    renderIdeas(savedIdeas, savedProfile, savedSelectedIdea);
  }

  if (savedRoadmap && savedSelectedIdea) {
    renderRoadmap(savedRoadmap, savedSelectedIdea);
  }

  apiKeyInput.addEventListener('change', (e) => {
    saveItem(StorageKeys.API_KEY, e.target.value.trim());
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatus();
    
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('Please enter a Gemini API Key.', 'error');
      return;
    }

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
    saveItem(StorageKeys.API_KEY, apiKey);

    // Clear previous results
    removeItem(StorageKeys.IDEAS);
    removeItem(StorageKeys.SELECTED_IDEA);
    removeItem(StorageKeys.ROADMAP);
    ideasGrid.innerHTML = '';
    ideasSection.classList.remove('hidden');
    roadmapSection.classList.add('hidden');
    ideasLoading.classList.remove('hidden');
    
    showStatus('Generating project ideas...', 'loading');

    try {
      const ideas = await generateProjectIdeas(apiKey, profile);
      saveItem(StorageKeys.IDEAS, ideas);
      ideasLoading.classList.add('hidden');
      renderIdeas(ideas, profile, null);
      showStatus('Ideas generated successfully!', 'success');
    } catch (error) {
      ideasLoading.classList.add('hidden');
      ideasSection.classList.add('hidden');
      showStatus(error.userMessage || error.message, 'error');
    }
  });

  function renderIdeas(ideas, profile, selectedIdea) {
    ideasSection.classList.remove('hidden');
    ideasGrid.innerHTML = '';
    
    ideas.forEach((idea, index) => {
      const scores = scoreProjectIdea(profile, idea);
      
      const card = document.createElement('div');
      card.className = `idea-card ${selectedIdea && selectedIdea.title === idea.title ? 'idea-card--selected' : ''}`;
      
      card.innerHTML = `
        <div class="idea-card__header">
          <div class="idea-card__rank">Idea ${index + 1}</div>
          <h3 class="idea-card__title">${escapeHtml(idea.title)}</h3>
          <p class="idea-card__description">${escapeHtml(idea.description)}</p>
        </div>
        <dl class="idea-card__details">
          <div class="idea-card__detail">
            <dt>Problem Statement</dt>
            <dd>${escapeHtml(idea.problem)}</dd>
          </div>
          <div class="idea-card__detail">
            <dt>Technologies</dt>
            <dd>${escapeHtml(idea.technologies.join(', '))}</dd>
          </div>
          <div class="idea-card__detail">
            <dt>Career Value</dt>
            <dd>${escapeHtml(idea.careerValue)}</dd>
          </div>
        </dl>
        <div class="score-panel">
          <h4 class="score-panel__heading">
            <span>Match Score</span>
            <span class="score-panel__overall">${scores.overall}%</span>
          </h4>
          <dl class="score-list">
            <div class="score-row">
              <dt class="score-row__label">Skill Match</dt>
              <dd class="score-row__value">${scores.skillMatch}%</dd>
              <div class="score-bar"><div class="score-bar__fill" style="width: ${scores.skillMatch}%"></div></div>
            </div>
            <div class="score-row">
              <dt class="score-row__label">Feasibility</dt>
              <dd class="score-row__value">${scores.feasibility}%</dd>
              <div class="score-bar"><div class="score-bar__fill" style="width: ${scores.feasibility}%"></div></div>
            </div>
          </dl>
        </div>
        <div class="idea-card__actions">
          <button class="button button--primary select-idea-btn">Select & Generate Roadmap</button>
        </div>
      `;
      
      const selectBtn = card.querySelector('.select-idea-btn');
      selectBtn.addEventListener('click', () => handleIdeaSelection(idea, profile, card));
      
      ideasGrid.appendChild(card);
    });
  }

  async function handleIdeaSelection(idea, profile, cardElement) {
    const validation = validateSelectedIdea(idea);
    if (!validation.isValid) {
      showStatus('Invalid idea selected.', 'error');
      return;
    }

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('Please enter a Gemini API Key to generate a roadmap.', 'error');
      return;
    }

    // Update UI selection state
    document.querySelectorAll('.idea-card').forEach(el => el.classList.remove('idea-card--selected'));
    cardElement.classList.add('idea-card--selected');
    
    saveItem(StorageKeys.SELECTED_IDEA, idea);
    removeItem(StorageKeys.ROADMAP);
    
    roadmapSection.classList.remove('hidden');
    roadmapContainer.innerHTML = '';
    roadmapLoading.classList.remove('hidden');
    
    showStatus('Generating mentor roadmap...', 'loading');
    window.scrollTo({ top: roadmapSection.offsetTop - 20, behavior: 'smooth' });

    try {
      const roadmap = await generateMentorRoadmap(apiKey, profile, idea);
      saveItem(StorageKeys.ROADMAP, roadmap);
      roadmapLoading.classList.add('hidden');
      renderRoadmap(roadmap, idea);
      showStatus('Roadmap generated successfully!', 'success');
    } catch (error) {
      roadmapLoading.classList.add('hidden');
      roadmapSection.classList.add('hidden');
      showStatus(error.userMessage || error.message, 'error');
    }
  }

  function renderRoadmap(roadmap, idea) {
    roadmapSection.classList.remove('hidden');
    roadmapContainer.innerHTML = `
      <div class="roadmap-summary">
        <h3 class="roadmap-summary__title">Roadmap for: ${escapeHtml(idea.title)}</h3>
        <p class="roadmap-summary__description">A step-by-step guide to executing your project.</p>
      </div>
      <ol class="roadmap-phase-list">
        ${roadmap.phases.map(phase => `
          <li class="roadmap-phase">
            <div class="roadmap-phase__header">
              <h4 class="roadmap-phase__title">${escapeHtml(phase.title)}</h4>
              <span class="roadmap-phase__duration">${escapeHtml(phase.duration || 'N/A')}</span>
            </div>
            <p class="roadmap-phase__description">${escapeHtml(phase.description)}</p>
            <p class="roadmap-phase__deliverable"><strong>Deliverable:</strong> ${escapeHtml(phase.deliverable)}</p>
            <ul class="roadmap-phase__tasks">
              ${phase.tasks.map(task => `<li>${escapeHtml(task)}</li>`).join('')}
            </ul>
          </li>
        `).join('')}
      </ol>
    `;
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
