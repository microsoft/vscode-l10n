/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Replaces escaped sequences in the string, including:
 *
 *  - Standard escapes (\r, \n, \t, and standard chars)
 *  - Unicode escapes (\xFF, \uFFFF, \u{10FFFF})
 *
 * Its behavior is undefined if the `text` is not a valid ECMAScript string.
 *
 * @see https://exploringjs.com/es6/ch_unicode.html
 */
export const unescapeString = (text: string): string => {
  for (let i = text.indexOf('\\'); i !== -1; i = text.indexOf('\\', i)) {
    if (text[i] !== '\\') {
      i++;
      continue;
    }

    let replace: string;
    let end = i + 2;
    const next = text[i + 1];

    switch (next) {
      case 'n':
        replace = '\n';
        break;
      case 'r':
        replace = '\r';
        break;
      case 't':
        replace = '\t';
        break;
      case 'x':
        end = i + 4;
        replace = String.fromCodePoint(parseInt(text.slice(i + 2, end), 16)); // hex escape, \xXX
        break;
      case 'u': {
        let int: string;
        if (text[i + 2] === '{') {
          end = text.indexOf('}') + 1; // unicode code point, \u{XX..}
          int = text.slice(i + 3, end - 1);
        } else {
          end = i + 6; // unicode code point, \uXXXX
          int = text.slice(i + 2, end - 1);
        }
        replace = String.fromCodePoint(parseInt(int, 16));
        break;
      }
      default:
        replace = next!;
        break;
    }

    text = text.slice(0, i) + replace + text.slice(end);
    i += replace.length;
  }

  return text;
};
