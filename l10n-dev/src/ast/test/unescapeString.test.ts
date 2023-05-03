import * as assert from 'assert';
import { unescapeString } from '../unescapeString';

describe('unescapeString', async () => {
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
      assert.strictEqual(unescapeString(input), expected);
    });
  }
});
