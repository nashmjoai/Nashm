import { AuthType } from 'nashm-data-provider';

/**
 * Checks if the given value is truthy by being either the boolean `true` or a string
 * that case-insensitively matches 'true'.
 *
 * @param value - The value to check.
 * @returns Returns `true` if the value is the boolean `true` or a case-insensitive
 *                    match for the string 'true', otherwise returns `false`.
 * @example
 *
 * isEnabled("True");  // returns true
 * isEnabled("TRUE");  // returns true
 * isEnabled(true);    // returns true
 * isEnabled("false"); // returns false
 * isEnabled(false);   // returns false
 * isEnabled(null);    // returns false
 * isEnabled();        // returns false
 */
export function isEnabled(value?: string | boolean | null | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase().trim() === 'true';
  }
  return false;
}

/**
 * Checks if the provided value is 'user_provided'.
 *
 * @param value - The value to check.
 * @returns - Returns true if the value is 'user_provided', otherwise false.
 */
export const isUserProvided = (value?: string): boolean => value === AuthType.USER_PROVIDED;

/**
 * Checks if a credential or URL value is missing, empty, or an unresolved environment variable template.
 * Returns true if value is empty or contains an unresolved environment variable like "${API_KEY}".
 * Returns false if value is valid or is 'user_provided'.
 */
export function isMissingCredential(value?: string | null): boolean {
  if (!value || !value.trim()) {
    return true;
  }
  const trimmed = value.trim();
  if (isUserProvided(trimmed)) {
    return false;
  }
  return /\${[^}]+}/.test(trimmed);
}

/**
 * @param values
 */
export function optionalChainWithEmptyCheck(
  ...values: (string | number | undefined)[]
): string | number | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return values[values.length - 1];
}
