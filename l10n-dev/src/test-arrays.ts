import { normalizeMessage, normalizeL10nJsonFormat } from './common';

// Test normalizeMessage
console.log('Testing normalizeMessage:');
console.log('String:', normalizeMessage('Hello World'));
console.log('Array:', normalizeMessage(['Line 1', 'Line 2', 'Line 3']));
console.log('Object:', normalizeMessage({ message: 'Complex message', comment: ['comment'] }));

// Test normalizeL10nJsonFormat
console.log('\nTesting normalizeL10nJsonFormat:');
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
console.log('Output:', JSON.stringify(normalizeL10nJsonFormat(testData), null, 2));