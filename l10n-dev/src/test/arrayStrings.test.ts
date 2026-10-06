/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect } from "@jest/globals";
import { normalizeMessage, normalizeL10nJsonFormat, l10nJsonFormat } from "../common";

describe('array string support', () => {
	describe('normalizeMessage', () => {
		it('handles string values', () => {
			expect(normalizeMessage('Hello World')).toBe('Hello World');
		});

		it('handles array values', () => {
			expect(normalizeMessage(['Line 1', 'Line 2', 'Line 3'])).toBe('Line 1\nLine 2\nLine 3');
		});

		it('handles single array values', () => {
			expect(normalizeMessage(['Single line'])).toBe('Single line');
		});

		it('handles empty arrays', () => {
			expect(normalizeMessage([])).toBe('');
		});

		it('handles complex object values', () => {
			expect(normalizeMessage({
				message: 'Complex message',
				comment: ['This is a comment']
			})).toBe('Complex message');
		});
	});

	describe('normalizeL10nJsonFormat', () => {
		it('normalizes mixed content', () => {
			const input: l10nJsonFormat = {
				simple: 'Hello World',
				multiline: [
					'Snippet used when adding videos to Markdown. This snippet can use the following variables:',
					'- `${src}` — The resolved path of the video file.',
					'- `${title}` — The title used for the video. A snippet placeholder will automatically be created for this variable.'
				],
				single: ['Just one line'],
				empty: [],
				complex: {
					message: 'Complex message',
					comment: ['This is a comment']
				}
			};

			const expected: l10nJsonFormat = {
				simple: 'Hello World',
				multiline: 'Snippet used when adding videos to Markdown. This snippet can use the following variables:\n- `${src}` — The resolved path of the video file.\n- `${title}` — The title used for the video. A snippet placeholder will automatically be created for this variable.',
				single: 'Just one line',
				empty: '',
				complex: {
					message: 'Complex message',
					comment: ['This is a comment']
				}
			};

			expect(normalizeL10nJsonFormat(input)).toEqual(expected);
		});
	});
});