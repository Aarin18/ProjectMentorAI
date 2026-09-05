import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }
  return next(error);
});

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    feasibilityScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
    verdict: { type: Type.STRING },
    summary: { type: Type.STRING },
    problemAnalysis: { type: Type.STRING },
    technicalDifficulty: { type: Type.STRING },
    estimatedDuration: { type: Type.STRING },
    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedTechStack: { type: Type.ARRAY, items: { type: Type.STRING } },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
    mentorAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
    roadmap: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'feasibilityScore', 'verdict', 'summary', 'problemAnalysis',
    'technicalDifficulty', 'estimatedDuration', 'requiredSkills',
    'recommendedTechStack', 'risks', 'improvements', 'mentorAdvice', 'roadmap',
  ],
};

function isValidAnalysis(data) {
  const requiredFields = [
    'feasibilityScore', 'verdict', 'summary', 'problemAnalysis',
    'technicalDifficulty', 'estimatedDuration', 'requiredSkills',
    'recommendedTechStack', 'risks', 'improvements', 'mentorAdvice', 'roadmap',
  ];

  return data && typeof data === 'object' && !Array.isArray(data)
    && Number.isInteger(data.feasibilityScore)
    && data.feasibilityScore >= 0 && data.feasibilityScore <= 100
    && requiredFields.every((field) => {
      if (field === 'feasibilityScore') return true;
      return Array.isArray(data[field])
        ? data[field].every((item) => typeof item === 'string' && item.trim())
        : typeof data[field] === 'string' && data[field].trim();
    });
}

function isValidRoadmap(data) {
  return data && Array.isArray(data.phases) && data.phases.length > 0
    && data.phases.every((phase) => phase && typeof phase.title === 'string'
      && typeof phase.description === 'string' && typeof phase.duration === 'string'
      && typeof phase.deliverable === 'string' && Array.isArray(phase.tasks)
      && phase.tasks.length > 0 && phase.tasks.every((task) => typeof task === 'string' && task.trim()));
}

async function generateGeminiJson(systemInstruction, prompt, responseSchema, validator = () => true, attempt = 0) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI analysis is temporarily unavailable. Please try again later.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'models/gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });
    const data = JSON.parse(response.text);
    if (!validator(data)) throw new Error('Invalid Gemini response.');
    return data;
  } catch (error) {
    if (error?.status === 503 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return generateGeminiJson(systemInstruction, prompt, responseSchema, validator, attempt + 1);
    }
    throw new Error('AI analysis is temporarily unavailable. Please try again later.');
  }
}

// --- Startup: check for GEMINI_API_KEY ---
if (process.env.GEMINI_API_KEY) {
  console.log('✓ GEMINI_API_KEY is configured (server-side secret detected).');
} else {
  console.warn('✗ GEMINI_API_KEY is NOT configured. AI endpoints will return 503.');
  console.warn('  → For local dev: create a .env file with  GEMINI_API_KEY=your_key_here');
  console.warn('  → For deployment: add GEMINI_API_KEY in your platform\'s Secrets / Environment Variables panel.');
}

// --- Routes ---

app.post('/api/analyze-project', async (req, res) => {
  console.log('[Analyze] Request received');
  try {
    const profile = req.body;

    if (!profile || !profile.skills) {
      return res.status(400).json({ error: 'Invalid request. Please fill out all profile fields.' });
    }

    const systemInstruction = `You are an expert technical mentor. Analyze the proposed student project profile and return ONLY valid JSON with exactly these fields:
  feasibilityScore (integer 0-100), verdict (string), summary (string), problemAnalysis (string), technicalDifficulty (string), estimatedDuration (string), requiredSkills (array of strings), recommendedTechStack (array of strings), risks (array of strings), improvements (array of strings), mentorAdvice (array of strings), roadmap (array of strings).
  Do not use markdown or add any other fields. Keep advice practical for the stated team size and timeline.`;

    const prompt = `Student Profile:
Skills: ${profile.skills}
Interests: ${profile.interests}
Experience: ${profile.experience}
Career Goal: ${profile.careerGoal}
Team Size: ${profile.teamSize}
Timeline: ${profile.timeline}`;

    console.log('[Analyze] Calling Gemini');
    const data = await generateGeminiJson(systemInstruction, prompt, ANALYSIS_SCHEMA, isValidAnalysis);
    console.log('[Analyze] Gemini response received');
    console.log('[Analyze] Sending result to frontend');
    res.json(data);
  } catch (error) {
    console.error('[Analyze] Gemini request failed');
    res.status(503).json({ error: 'AI analysis is temporarily unavailable. Please try again later.' });
  }
});

app.post('/api/generate-roadmap', async (req, res) => {
  try {
    const { profile, selectedIdea } = req.body;

    if (!profile || !selectedIdea || !selectedIdea.title) {
      return res.status(400).json({ error: 'Invalid request. Please select a project idea first.' });
    }

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

    const data = await generateGeminiJson(systemInstruction, prompt, {
      type: Type.OBJECT,
      properties: {
        phases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING }, description: { type: Type.STRING },
              duration: { type: Type.STRING }, deliverable: { type: Type.STRING },
              tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'description', 'duration', 'deliverable', 'tasks'],
          },
        },
      },
      required: ['phases'],
    }, isValidRoadmap);
    res.json(data);
  } catch (error) {
    console.error('POST /api/generate-roadmap error:', error.message);
    res.status(503).json({ error: 'AI analysis is temporarily unavailable. Please try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
