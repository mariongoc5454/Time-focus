import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  validateDomain,
  isDomainMatch,
  checkDomainAgainstRules,
} from '../electron/services/domainMatcher';
import { DistractionRule } from '../src/types';

describe('Domain Matcher & Anti-Spoofing Suite', () => {
  it('correctly normalizes domains, stripping protocols, www, paths, queries and ports', () => {
    expect(normalizeDomain('https://www.youtube.com/watch?v=123')).toBe('youtube.com');
    expect(normalizeDomain('http://m.facebook.com:8080/feed?ref=1')).toBe('m.facebook.com');
    expect(normalizeDomain('WWW.TIKTOK.COM/')).toBe('tiktok.com');
    expect(normalizeDomain('reddit.com.')).toBe('reddit.com');
    expect(normalizeDomain('   https://x.com/home   ')).toBe('x.com');
  });

  it('validates domain format and rejects malformed inputs', () => {
    expect(validateDomain('youtube.com').valid).toBe(true);
    expect(validateDomain('m.youtube.com').valid).toBe(true);
    expect(validateDomain('sub.domain.co.uk').valid).toBe(true);

    expect(validateDomain('').valid).toBe(false);
    expect(validateDomain('not a domain').valid).toBe(false);
    expect(validateDomain('youtube').valid).toBe(false); // missing TLD
  });

  it('matches subdomains accurately and prevents domain spoofing', () => {
    // Exact match
    expect(isDomainMatch('youtube.com', 'youtube.com')).toBe(true);
    expect(isDomainMatch('www.youtube.com', 'youtube.com')).toBe(true);

    // Subdomains
    expect(isDomainMatch('m.youtube.com', 'youtube.com')).toBe(true);
    expect(isDomainMatch('music.youtube.com', 'youtube.com')).toBe(true);
    expect(isDomainMatch('sub.m.youtube.com', 'youtube.com')).toBe(true);

    // ANTI-SPOOFING: attacker domains must NEVER match!
    expect(isDomainMatch('youtube.com.attacker.org', 'youtube.com')).toBe(false);
    expect(isDomainMatch('fake-youtube.com', 'youtube.com')).toBe(false);
    expect(isDomainMatch('youtube.com.vn.evil.com', 'youtube.com')).toBe(false);
    expect(isDomainMatch('notyoutube.com', 'youtube.com')).toBe(false);
  });

  it('respects allowlist priority over distraction rules', () => {
    const rules: DistractionRule[] = [
      {
        id: '1',
        domain: 'google.com',
        enabled: true,
        is_allowed: false, // blocked
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        domain: 'docs.google.com',
        enabled: true,
        is_allowed: true, // allowed (whitelisted for study)
        created_at: '',
        updated_at: '',
      },
    ];

    // Visiting docs.google.com should be permitted because it matches the allowlist rule
    const checkAllowed = checkDomainAgainstRules('docs.google.com', rules);
    expect(checkAllowed.isAllowed).toBe(true);
    expect(checkAllowed.isDistracting).toBe(false);

    // Visiting news.google.com is not allowed, so it hits the distraction rule
    const checkBlocked = checkDomainAgainstRules('news.google.com', rules);
    expect(checkBlocked.isAllowed).toBe(false);
    expect(checkBlocked.isDistracting).toBe(true);
    expect(checkBlocked.matchedRule?.domain).toBe('google.com');
  });

  it('ignores disabled rules', () => {
    const rules: DistractionRule[] = [
      {
        id: '1',
        domain: 'tiktok.com',
        enabled: false, // disabled rule
        is_allowed: false,
        created_at: '',
        updated_at: '',
      },
    ];

    const check = checkDomainAgainstRules('www.tiktok.com', rules);
    expect(check.isDistracting).toBe(false);
  });
});
