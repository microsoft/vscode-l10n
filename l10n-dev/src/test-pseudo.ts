import { getL10nPseudoLocalized } from './main';

// Test pseudo-localization with arrays
console.log('Testing getL10nPseudoLocalized with arrays:');
const testData = {
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

console.log('Input:', JSON.stringify(testData, null, 2));
const result = getL10nPseudoLocalized(testData);
console.log('Output:', JSON.stringify(result, null, 2));