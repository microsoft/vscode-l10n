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

describe('unescapeString', () => {
	it.each([
		[String.raw`\u0041`, 'A'],
		[String.raw`\u00E9\u4E2D`, 'é中'],
		[String.raw`\uD83D\uDE00`, '😀'],
		[String.raw`prefix} \u{1F600}`, 'prefix} 😀'],
		[String.raw`{name} \u{41} \u{1F680}`, '{name} A 🚀'],
		[String.raw`\u0041\u{1F600}\u0042`, 'A😀B'],
	])('decodes Unicode escapes in %s', (input, expected) => {
		expect(unescapeString(input)).toBe(expected);
	});

	it.each([
		[String.raw`\u{1F600} \u{1F680}`, '😀 🚀'],
		[String.raw`\x41\n\r\t\'\"\\`, 'A\n\r\t\'"\\'],
		[String.raw`\\u0041`, String.raw`\u0041`],
		[String.raw`plain {name}`, 'plain {name}'],
	])('preserves existing escape behavior for %s', (input, expected) => {
		expect(unescapeString(input)).toBe(expected);
	});
});
