/**
 * Purpose: Validates student profiles, Gemini responses, stored data, and
 * application errors before other modules use them.
 * Exports: normalizeError, validateStudentProfile, validateProjectIdeas,
 * validateSelectedIdea, and validateMentorRoadmap.
 * Dependencies: Standard browser JavaScript only; no DOM, API, or storage access.
 */

const PROFILE_LIMITS = Object.freeze({
  skills: { minLength: 2, maxLength: 1000 },
  interests: { minLength: 2, maxLength: 1000 },
  experience: { minLength: 2, maxLength: 2000 },
  careerGoal: { minLength: 2, maxLength: 500 },
  teamSize: { min: 1, max: 20 },
  timeline: { minLength: 2, maxLength: 100 },
});

const IDEA_LIMITS = Object.freeze({
  minimumCount: 3,
  maximumCount: 5,
});

const ROADMAP_LIMITS = Object.freeze({
  minimumPhases: 1,
  maximumPhases: 12,
});

const ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_PROFILE: 'INVALID_PROFILE',
  INVALID_IDEAS: 'INVALID_IDEAS',
  INVALID_SELECTED_IDEA: 'INVALID_SELECTED_IDEA',
  INVALID_ROADMAP: 'INVALID_ROADMAP',
  EMPTY_RESULTS: 'EMPTY_RESULTS',
  STORAGE_ERROR: 'STORAGE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  API_ERROR: 'API_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
});

function createValidationResult(isValid, value, errors = []) {
  return Object.freeze({
    isValid,
    value: isValid ? value : null,
    errors: [...errors],
  });
}

function createValidationError(field, message) {
  return Object.freeze({ field, message });
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value, limits) {
  return (
    typeof value === 'string' &&
    value.trim().length >= limits.minLength &&
    value.trim().length <= limits.maxLength
  );
}

function isPositiveInteger(value, limits) {
  return (
    Number.isInteger(value) &&
    value >= limits.min &&
    value <= limits.max
  );
}

function validateStudentProfile(profile) {
  if (!isPlainObject(profile)) {
    return createValidationResult(false, null, [
      createValidationError('profile', 'A valid student profile is required.'),
    ]);
  }

  const errors = [];
  const stringFields = [
    ['skills', 'Enter at least one relevant skill.'],
    ['interests', 'Enter at least one area of interest.'],
    ['experience', 'Describe your relevant experience.'],
    ['careerGoal', 'Enter a career goal.'],
    ['timeline', 'Enter the project timeline.'],
  ];

  stringFields.forEach(([field, message]) => {
    if (!isNonEmptyString(profile[field], PROFILE_LIMITS[field])) {
      errors.push(createValidationError(field, message));
    }
  });

  if (!isPositiveInteger(profile.teamSize, PROFILE_LIMITS.teamSize)) {
    errors.push(
      createValidationError(
        'teamSize',
        'Team size must be a whole number between 1 and 20.',
      ),
    );
  }

  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  const normalizedProfile = {
    skills: profile.skills.trim(),
    interests: profile.interests.trim(),
    experience: profile.experience.trim(),
    careerGoal: profile.careerGoal.trim(),
    teamSize: profile.teamSize,
    timeline: profile.timeline.trim(),
  };

  return createValidationResult(true, normalizedProfile);
}

function validateScore(score, field) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return createValidationError(
      field,
      'Scores must be numbers between 0 and 100.',
    );
  }

  return null;
}

function validateIdea(idea, index) {
  const errors = [];
  const prefix = `ideas[${index}]`;
  const requiredStrings = [
    ['title', 'Project idea title is required.'],
    ['description', 'Project idea description is required.'],
    ['problem', 'Project problem statement is required.'],
    ['careerValue', 'Project career value is required.'],
  ];

  if (!isPlainObject(idea)) {
    return [createValidationError(prefix, 'Each project idea must be an object.')];
  }

  requiredStrings.forEach(([field, message]) => {
    if (typeof idea[field] !== 'string' || idea[field].trim().length === 0) {
      errors.push(createValidationError(`${prefix}.${field}`, message));
    }
  });

  if (!Array.isArray(idea.technologies) || idea.technologies.length === 0) {
    errors.push(
      createValidationError(
        `${prefix}.technologies`,
        'Each project idea needs at least one technology.',
      ),
    );
  } else if (idea.technologies.some((technology) => typeof technology !== 'string' || technology.trim() === '')) {
    errors.push(
      createValidationError(
        `${prefix}.technologies`,
        'Project technologies must be non-empty strings.',
      ),
    );
  }

  const scoreFields = [
    'skillMatch',
    'feasibility',
    'innovation',
    'careerValueScore',
    'technicalDepth',
  ];

  scoreFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(idea, field)) {
      const error = validateScore(idea[field], `${prefix}.${field}`);
      if (error) {
        errors.push(error);
      }
    }
  });

  return errors;
}

function validateProjectIdeas(ideas) {
  if (!Array.isArray(ideas)) {
    return createValidationResult(false, null, [
      createValidationError('ideas', 'Gemini must return a project-idea array.'),
    ]);
  }

  if (ideas.length === 0) {
    return createValidationResult(false, null, [
      createValidationError('ideas', 'Gemini returned no project ideas.'),
    ]);
  }

  if (ideas.length < IDEA_LIMITS.minimumCount || ideas.length > IDEA_LIMITS.maximumCount) {
    return createValidationResult(false, null, [
      createValidationError(
        'ideas',
        `Gemini must return between ${IDEA_LIMITS.minimumCount} and ${IDEA_LIMITS.maximumCount} project ideas.`,
      ),
    ]);
  }

  const errors = ideas.flatMap((idea, index) => validateIdea(idea, index));
  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  const normalizedIdeas = ideas.map((idea) => ({
    ...idea,
    title: idea.title.trim(),
    description: idea.description.trim(),
    problem: idea.problem.trim(),
    careerValue: idea.careerValue.trim(),
    technologies: idea.technologies.map((technology) => technology.trim()),
  }));

  return createValidationResult(true, normalizedIdeas);
}

function validateSelectedIdea(idea) {
  if (!isPlainObject(idea)) {
    return createValidationResult(false, null, [
      createValidationError('selectedIdea', 'Select a valid project idea.'),
    ]);
  }

  const errors = validateIdea(idea, 0);
  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  return createValidationResult(true, idea);
}

function validateRoadmapPhase(phase, index) {
  const prefix = `roadmap.phases[${index}]`;
  const errors = [];

  if (!isPlainObject(phase)) {
    return [createValidationError(prefix, 'Each roadmap phase must be an object.')];
  }

  ['title', 'description', 'deliverable'].forEach((field) => {
    if (typeof phase[field] !== 'string' || phase[field].trim() === '') {
      errors.push(
        createValidationError(`${prefix}.${field}`, `Roadmap ${field} is required.`),
      );
    }
  });

  if (!Array.isArray(phase.tasks) || phase.tasks.length === 0) {
    errors.push(
      createValidationError(
        `${prefix}.tasks`,
        'Each roadmap phase needs at least one task.',
      ),
    );
  } else if (phase.tasks.some((task) => typeof task !== 'string' || task.trim() === '')) {
    errors.push(
      createValidationError(
        `${prefix}.tasks`,
        'Roadmap tasks must be non-empty strings.',
      ),
    );
  }

  return errors;
}

function validateMentorRoadmap(roadmap) {
  if (!isPlainObject(roadmap)) {
    return createValidationResult(false, null, [
      createValidationError('roadmap', 'Gemini must return a roadmap object.'),
    ]);
  }

  if (!Array.isArray(roadmap.phases) || roadmap.phases.length === 0) {
    return createValidationResult(false, null, [
      createValidationError('roadmap.phases', 'The roadmap must contain at least one phase.'),
    ]);
  }

  if (roadmap.phases.length > ROADMAP_LIMITS.maximumPhases) {
    return createValidationResult(false, null, [
      createValidationError(
        'roadmap.phases',
        `The roadmap cannot contain more than ${ROADMAP_LIMITS.maximumPhases} phases.`,
      ),
    ]);
  }

  const errors = roadmap.phases.flatMap(validateRoadmapPhase);
  if (errors.length > 0) {
    return createValidationResult(false, null, errors);
  }

  const normalizedRoadmap = {
    ...roadmap,
    phases: roadmap.phases.map((phase) => ({
      ...phase,
      title: phase.title.trim(),
      description: phase.description.trim(),
      deliverable: phase.deliverable.trim(),
      tasks: phase.tasks.map((task) => task.trim()),
    })),
  };

  return createValidationResult(true, normalizedRoadmap);
}

function normalizeError(error, fallback = {}) {
  const source = error instanceof Error ? error : null;
  const normalized = isPlainObject(error) ? error : {};

  return Object.freeze({
    code: typeof normalized.code === 'string' ? normalized.code : fallback.code || ERROR_CODES.API_ERROR,
    message: typeof normalized.message === 'string'
      ? normalized.message
      : source?.message || fallback.message || 'An unexpected application error occurred.',
    userMessage: typeof normalized.userMessage === 'string'
      ? normalized.userMessage
      : fallback.userMessage || 'Something went wrong. Please try again.',
    details: normalized.details ?? fallback.details ?? null,
    cause: normalized.cause ?? source ?? null,
    retryable: typeof normalized.retryable === 'boolean'
      ? normalized.retryable
      : Boolean(fallback.retryable),
  });
}

export {
  ERROR_CODES,
  normalizeError,
  validateMentorRoadmap,
  validateProjectIdeas,
  validateSelectedIdea,
  validateStudentProfile,
};
