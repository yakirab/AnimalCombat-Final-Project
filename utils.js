// Shared utility functions for AnimalCombat

/**
 * Encodes an email address to be a valid Firestore document ID.
 * Replaces dots with commas since Firestore IDs cannot contain dots.
 */
export const encodeEmail = (email) => (email || '').replace(/\./g, ',');
