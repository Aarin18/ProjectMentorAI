import { ERROR_CODES, normalizeError, validateProjectAnalysis } from './validation.js';

async function analyzeProject(profile) {
  try {
    const response = await fetch('/api/analyze-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw normalizeError({
        code: ERROR_CODES.HTTP_ERROR,
        message: `HTTP error! status: ${response.status}`,
        details: errorData,
        userMessage: errorData.error || 'The AI service is currently unavailable. Please try again later.',
      });
    }

    const parsedData = await response.json();
    
    const validationResult = validateProjectAnalysis(parsedData);
    
    if (!validationResult.isValid) {
      throw normalizeError({
        code: ERROR_CODES.INVALID_JSON,
        message: 'The generated analysis did not pass validation.',
        details: validationResult.errors,
        userMessage: 'The AI service generated an incomplete analysis. Please try again.',
      });
    }

    return validationResult.value;
  } catch (error) {
    if (error.code) {
      throw error; // Already normalized
    }
    throw normalizeError(error, {
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Network error occurred while contacting the server.',
      userMessage: 'Could not connect to the server. Please check your internet connection.',
    });
  }
}

export { analyzeProject };
