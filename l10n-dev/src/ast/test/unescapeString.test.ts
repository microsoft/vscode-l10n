import { describe, it, expect } from '@jest/globals';
import { unescapeString } from '../unescapeString';

describe('unescapeString', () => {
  const testTable = [
    ['a\\nb', 'a\nb'],
    ['a\\rb', 'a\rb'],
    ['\\x20', ' '],
    ['\\u{20}', ' '],
    ['\\u{1F600}', '😀'],
    ['h\'el`l"\\o', 'h\'el`l"o'],
    ['\\\\\\\'\\`\\"', '\\\'`"'],
  ] as const;

  for (const [input, expected] of testTable) {
    it(`should unescape ${input} to ${expected}`, () => {
      expect(unescapeString(input)).toBe(expected);
    });
  }
});
