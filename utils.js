// File Overview: utils.js
// What this file is: Small shared helper utilities used in multiple files.
// When this runs: Loaded when this module is imported by a screen/service.
// Main inputs: React state/props, Firebase data, and shared modules.
// Main outputs: UI rendering and/or side effects (navigation, reads/writes, audio).
// Read this first: Start from the main exported component/function, then follow hooks/callbacks in order.

// Shared utility functions for AnimalCombat

/**
 * Encodes an email address to be a valid Firestore document ID.
 * Replaces dots with commas since Firestore IDs cannot contain dots.
 */
export const encodeEmail = (email) => (email || '').replace(/\./g, ',');

export const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

export const responsiveScale = (width, height, multiplier = 1, min = 0.75, max = 1.15) => {
  const widthScale = width / 1440;
  const heightScale = height / 900;
  return clampNumber(Math.min(widthScale, heightScale) * multiplier, min, max);
};

