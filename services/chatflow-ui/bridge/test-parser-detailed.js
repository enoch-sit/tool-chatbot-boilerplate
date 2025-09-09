import { parseMixedContent } from './src/utils/contentParser.js';

const testContent = `Sure! Here are some basic formulas:

### **Arithmetic Formulas:**
1. **Addition**:  
   \\( a + b \\)  
   Example: \\( 3 + 5 = 8 \\)

2. **Multiplication**:  
   \\( a \\times b \\) (or \\( a \\cdot b \\))  
   Example: \\( 6 \\times 4 = 24 \\)`;

console.log('Testing content parser...');
console.log('Input:', testContent);
console.log('---');

const blocks = parseMixedContent(testContent);
console.log('Parsed blocks:');
blocks.forEach((block, i) => {
  console.log(`Block ${i}:`, {
    type: block.type,
    content: JSON.stringify(block.content.substring(0, 200)),
    display: 'display' in block ? block.display : 'N/A'
  });
});
