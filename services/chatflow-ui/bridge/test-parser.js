// Test the content parser
import { parseMixedContent } from '../src/utils/contentParser';

const testContent = `Where:
- \\(a, c\\) are numerators
- \\(b, d\\) are denominators`;

console.log('Testing content parser...');
console.log('Input:', testContent);
console.log('---');

const blocks = parseMixedContent(testContent);
console.log('Parsed blocks:');
blocks.forEach((block, i) => {
  console.log(`Block ${i}:`, {
    type: block.type,
    content: JSON.stringify(block.content),
    display: 'display' in block ? block.display : 'N/A'
  });
});
