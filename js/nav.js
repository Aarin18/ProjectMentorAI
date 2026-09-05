/**
 * Purpose: Handles smooth-scroll navigation and active states for the header nav.
 * Exports: initNavigation.
 * Dependencies: Storage module (for checking if roadmap exists).
 */

import { StorageKeys, loadItem } from './storage.js';

function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  if (navLinks.length < 3) return; // Ensure we have the links

  const aboutLink = navLinks[0];
  const generateLink = navLinks[1];
  const roadmapLink = navLinks[2];

  const aboutSection = document.getElementById('about-section');
  const profileSection = document.getElementById('profile-section');
  const roadmapSection = document.getElementById('roadmap-section');
  
  // Smooth scroll helper
  const smoothScrollTo = (element) => {
    if (!element) return;
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      // Fallback for browsers that don't support smooth scrolling behavior
      element.scrollIntoView();
    }
  };

  aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    smoothScrollTo(aboutSection);
  });

  generateLink.addEventListener('click', (e) => {
    e.preventDefault();
    smoothScrollTo(profileSection);
  });

  roadmapLink.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Check if roadmap exists in localStorage
    const savedRoadmap = loadItem(StorageKeys.ROADMAP);
    
    // We also check if the section is currently visible (not hidden)
    // because if it's hidden, scrolling to it won't make sense even if data exists
    if (savedRoadmap && !roadmapSection.classList.contains('hidden')) {
      smoothScrollTo(roadmapSection);
    } else {
      // Show inline message near the button
      let msg = document.getElementById('roadmap-nav-msg');
      if (!msg) {
        msg = document.createElement('span');
        msg.id = 'roadmap-nav-msg';
        msg.textContent = 'Generate and pick a project idea first.';
        msg.style.cssText = 'position: absolute; background: var(--color-ink); color: var(--color-surface); padding: 0.5rem 1rem; border-radius: var(--radius-small); font-size: 0.85rem; font-weight: bold; margin-top: 3.5rem; right: 0; z-index: 100; box-shadow: 4px 4px 0 var(--color-ink); border: 2px solid var(--color-ink);';
        
        // Append near the header nav
        const navContainer = document.querySelector('.app-header__nav');
        if (navContainer) {
          navContainer.style.position = 'relative';
          navContainer.appendChild(msg);
          
          setTimeout(() => {
            if (msg && msg.parentNode) msg.parentNode.removeChild(msg);
          }, 3500);
        }
      }
    }
  });

  // Active state handling with IntersectionObserver
  const sections = [
    { el: aboutSection, link: aboutLink },
    { el: profileSection, link: generateLink },
    { el: roadmapSection, link: roadmapLink }
  ];

  // Observer options tailored for detecting which section is mostly in view
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Find corresponding link
        const activeSection = sections.find(s => s.el === entry.target);
        
        if (activeSection && !activeSection.el.classList.contains('hidden')) {
          // Reset all
          sections.forEach(s => {
            s.link.style.backgroundColor = 'var(--color-surface)';
          });
          
          // Highlight active
          activeSection.link.style.backgroundColor = 'var(--color-hero)';
        }
      }
    });
  }, observerOptions);

  sections.forEach(s => {
    if (s.el) observer.observe(s.el);
  });
}

export { initNavigation };
