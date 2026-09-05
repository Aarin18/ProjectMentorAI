/**
 * Purpose: Provides a deterministic scoring engine for project ideas based on the student's profile.
 * Exports: scoreProjectIdea.
 * Dependencies: Standard browser JavaScript only; no API or DOM access.
 */

function generateDeterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function calculateStringMatch(profileString, ideaString) {
  const pWords = profileString.toLowerCase().match(/\w+/g) || [];
  const iWords = ideaString.toLowerCase().match(/\w+/g) || [];
  
  if (pWords.length === 0 || iWords.length === 0) return 0;

  const pSet = new Set(pWords);
  let matches = 0;
  iWords.forEach(word => {
    if (pSet.has(word)) matches++;
  });

  return Math.min(100, Math.round((matches / (iWords.length + 1)) * 200));
}

function scoreProjectIdea(profile, idea) {
  // Skill Match: overlap between profile skills and idea technologies/description
  const skillMatch = Math.min(100, calculateStringMatch(profile.skills, idea.technologies.join(' ') + ' ' + idea.description) + 30);
  
  // Feasibility: inversely proportional to timeline length vs team size, smoothed with hash for variety
  const timelineHash = generateDeterministicHash(profile.timeline) % 40;
  const teamSizeFactor = Math.min(20, profile.teamSize * 5);
  const feasibility = Math.min(100, Math.max(0, 50 + teamSizeFactor - timelineHash + (generateDeterministicHash(idea.title) % 20)));

  // Innovation: based on idea title and description uniqueness/length
  const innovation = Math.min(100, 60 + (generateDeterministicHash(idea.problem) % 40));

  // Career Value: overlap between career goal and idea career value
  const careerValueScore = Math.min(100, calculateStringMatch(profile.careerGoal, idea.careerValue) + 50 + (generateDeterministicHash(idea.title) % 20));

  // Technical Depth: based on number of technologies and description length
  const techDepth = Math.min(100, (idea.technologies.length * 10) + (idea.description.length % 30) + 30);

  const overall = Math.round((skillMatch + feasibility + innovation + careerValueScore + techDepth) / 5);

  return {
    skillMatch: Math.round(skillMatch),
    feasibility: Math.round(feasibility),
    innovation: Math.round(innovation),
    careerValueScore: Math.round(careerValueScore),
    technicalDepth: Math.round(techDepth),
    overall
  };
}

export { scoreProjectIdea };
