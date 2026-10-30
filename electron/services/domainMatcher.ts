import { DistractionRule } from '../../src/types';

/**
 * Normalizes a raw URL or domain string into a clean lowercase root/subdomain.
 * Strips protocols (http://, https://), trailing paths, queries, ports, and leading "www.".
 */
export function normalizeDomain(input: string): string {
  if (!input) return '';
  let str = input.trim().toLowerCase();

  // Strip protocol if present
  str = str.replace(/^[a-z]+:\/\//i, '');

  // Strip paths, queries, and hash fragments
  str = str.split('/')[0];
  str = str.split('?')[0];
  str = str.split('#')[0];

  // Strip port if present
  str = str.split(':')[0];

  // Strip leading www.
  if (str.startsWith('www.')) {
    str = str.substring(4);
  }

  // Strip trailing dot
  if (str.endsWith('.')) {
    str = str.slice(0, -1);
  }

  return str.trim();
}

/**
 * Validates whether a normalized domain conforms to standard domain name format.
 * Rejects IP addresses, invalid characters, and spoofed domains.
 */
export function validateDomain(input: string): { valid: boolean; error?: string } {
  const normalized = normalizeDomain(input);
  if (!normalized) {
    return { valid: false, error: 'Tên miền không được để trống.' };
  }

  if (normalized.length > 253) {
    return { valid: false, error: 'Tên miền quá dài (tối đa 253 ký tự).' };
  }

  // Basic domain regex matching labels separated by dots
  // Each label: 1-63 alphanumeric chars or hyphens (not starting or ending with hyphen)
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(normalized)) {
    return {
      valid: false,
      error: 'Định dạng tên miền không hợp lệ (Ví dụ hợp lệ: youtube.com, facebook.com).',
    };
  }

  return { valid: true };
}

/**
 * Checks whether a visited hostname matches a target rule domain.
 * - Handles subdomains correctly: "m.youtube.com" matches "youtube.com"
 * - Prevents false positive domain spoofing: "youtube.com.attacker.org" does NOT match "youtube.com"!
 * - Exact match: "youtube.com" matches "youtube.com"
 */
export function isDomainMatch(visitedHost: string, targetDomain: string): boolean {
  const v = normalizeDomain(visitedHost);
  const t = normalizeDomain(targetDomain);

  if (!v || !t) return false;

  // Exact match
  if (v === t) return true;

  // Subdomain match: visitedHost must end with "." + targetDomain
  // e.g. "m.youtube.com".endsWith(".youtube.com") -> TRUE
  // "youtube.com.attacker.com".endsWith(".youtube.com") -> FALSE
  if (v.endsWith('.' + t)) {
    return true;
  }

  return false;
}

/**
 * Checks a visited host against all distraction and allowlist rules.
 * Allowlist rules have strict priority: if an allowed domain matches, it is NEVER considered distracting.
 */
export function checkDomainAgainstRules(
  visitedHost: string,
  rules: DistractionRule[]
): {
  isDistracting: boolean;
  matchedRule?: DistractionRule;
  isAllowed: boolean;
} {
  const normalizedVisited = normalizeDomain(visitedHost);
  if (!normalizedVisited) {
    return { isDistracting: false, isAllowed: false };
  }

  // 1. Check Allowlist first
  const allowedRule = rules.find(
    (r) => r.enabled && r.is_allowed && isDomainMatch(normalizedVisited, r.domain)
  );

  if (allowedRule) {
    return {
      isDistracting: false,
      matchedRule: allowedRule,
      isAllowed: true,
    };
  }

  // 2. Check Distraction list
  const distractingRule = rules.find(
    (r) => r.enabled && !r.is_allowed && isDomainMatch(normalizedVisited, r.domain)
  );

  if (distractingRule) {
    return {
      isDistracting: true,
      matchedRule: distractingRule,
      isAllowed: false,
    };
  }

  return { isDistracting: false, isAllowed: false };
}
