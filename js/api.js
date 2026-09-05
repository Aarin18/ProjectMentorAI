/**
 * Purpose: Integrates with the Google Gemini API to generate project ideas and mentor roadmaps.
 * Exports: generateProjectIdeas, generateMentorRoadmap.
 * Dependencies: Fetch API, validation module.
 */

import { ERROR_CODES, normalizeError, validateProjectIdeas, validateMentorRoadmap } from './validation.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

async function fetchGeminiData(apiKey, systemInstruction, prompt, attempt = 0) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw normalizeError({
      code: ERROR_CODES.CONFIGURATION_ERROR,
      message: 'API key is missing or invalid.',
      userMessage: 'Please provide a valid Gemini API key.',
    });
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      if (response.status === 503 && attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchGeminiData(apiKey, systemInstruction, prompt, 1);
      }

      const errorData = await response.json().catch(() => ({}));
      throw normalizeError({
        code: ERROR_CODES.HTTP_ERROR,
        message: `HTTP error! status: ${response.status}`,
        details: errorData,
        userMessage: 'The AI service is currently unavailable. Please check your API key or try again later.',
      });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
      throw normalizeError({
        code: ERROR_CODES.API_ERROR,
        message: 'Invalid response format from Gemini API.',
        userMessage: 'The AI service returned an unexpected response. Please try again.',
      });
    }

    const jsonText = data.candidates[0].content.parts[0].text;
    
    try {
      return JSON.parse(jsonText);
    } catch (parseError) {
      throw normalizeError({
        code: ERROR_CODES.INVALID_JSON,
        message: 'Failed to parse JSON from Gemini API.',
        cause: parseError,
        userMessage: 'The AI service returned malformed data. Please try again.',
      });
    }
  } catch (error) {
    if (error.code) {
      throw error; // Already normalized
    }
    throw normalizeError(error, {
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Network error occurred while contacting Gemini API.',
      userMessage: 'Could not connect to the AI service. Please check your internet connection.',
    });
  }
}

async function generateProjectIdeas(apiKey, profile) {
  const systemInstruction = `You are an expert technical mentor. Generate exactly 3-5 project ideas for a final-year student based on their profile. Return ONLY a JSON array of objects. Each object must have these exact keys (all strings except for an array of strings for technologies):
- title: Project title
- description: Detailed description
- problem: The problem it solves
- careerValue: How this helps their career goal
- technologies: Array of technology names
Do NOT wrap the JSON array in any markdown (like \`\`\`json). Just the array.`;

  const prompt = `Student Profile:
Skills: ${profile.skills}
Interests: ${profile.interests}
Experience: ${profile.experience}
Career Goal: ${profile.careerGoal}
Team Size: ${profile.teamSize}
Timeline: ${profile.timeline}`;

  const parsedData = await fetchGeminiData(apiKey, systemInstruction, prompt);
  
  // validateProjectIdeas expects an array of ideas
  const validationResult = validateProjectIdeas(parsedData);
  
  if (!validationResult.isValid) {
    throw normalizeError({
      code: ERROR_CODES.INVALID_IDEAS,
      message: 'The generated ideas did not pass validation.',
      details: validationResult.errors,
      userMessage: 'The AI service generated incomplete ideas. Please try again.',
    });
  }

  return validationResult.value;
}

async function generateMentorRoadmap(apiKey, profile, selectedIdea) {
  const systemInstruction = `You are an expert technical mentor. Generate a detailed project roadmap for the student's chosen project. Return ONLY a JSON object with a single key "phases", which is an array of phase objects. Each phase object must have these exact keys:
- title: Phase title (string)
- description: Phase description (string)
- duration: Estimated duration (string)
- deliverable: Key deliverable for this phase (string)
- tasks: Array of specific task descriptions (array of strings)
Do NOT wrap the JSON in any markdown (like \`\`\`json). Just the object.`;

  const prompt = `Student Profile:
Skills: ${profile.skills}
Timeline: ${profile.timeline}

Selected Project Idea:
Title: ${selectedIdea.title}
Description: ${selectedIdea.description}
Technologies: ${selectedIdea.technologies.join(', ')}`;

  const parsedData = await fetchGeminiData(apiKey, systemInstruction, prompt);
  
  const validationResult = validateMentorRoadmap(parsedData);
  
  if (!validationResult.isValid) {
    throw normalizeError({
      code: ERROR_CODES.INVALID_ROADMAP,
      message: 'The generated roadmap did not pass validation.',
      details: validationResult.errors,
      userMessage: 'The AI service generated an incomplete roadmap. Please try again.',
    });
  }

  return validationResult.value;
}

export { generateProjectIdeas, generateMentorRoadmap };
