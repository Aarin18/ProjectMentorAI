/**
 * Purpose: Manages reading, writing, and removing data from browser localStorage.
 * Exports: StorageKeys, saveItem, loadItem, removeItem.
 * Dependencies: Standard browser JavaScript only; uses localStorage.
 */

import { ERROR_CODES, normalizeError } from './validation.js';

const StorageKeys = Object.freeze({
  PROFILE: 'projectmentor_profile',
  IDEAS: 'projectmentor_ideas',
  SELECTED_IDEA: 'projectmentor_selected_idea',
  ROADMAP: 'projectmentor_roadmap',
});

function saveItem(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.error(normalizeError(err, {
      code: ERROR_CODES.STORAGE_ERROR,
      message: `Failed to save item to localStorage for key: ${key}`,
    }));
    return false;
  }
}

function loadItem(key) {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) {
      return null;
    }
    return JSON.parse(serialized);
  } catch (err) {
    console.error(normalizeError(err, {
      code: ERROR_CODES.STORAGE_ERROR,
      message: `Failed to parse item from localStorage for key: ${key}`,
    }));
    return null;
  }
}

function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(normalizeError(err, {
      code: ERROR_CODES.STORAGE_ERROR,
      message: `Failed to remove item from localStorage for key: ${key}`,
    }));
    return false;
  }
}

export { StorageKeys, saveItem, loadItem, removeItem };
