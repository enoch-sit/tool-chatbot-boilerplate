// Test content similar to your Newton's Law example
const testContent = `### Newton's Law of Gravitation
This formula describes the gravitational force between two masses:
\\[
F = G \\frac{m_1 m_2}{r^2}
\\]
Where:
- \\(F\\) is the gravitational force,
- \\(G\\) is the gravitational constant (\\(6.674 \\times 10^{-11} \\, \\text{Nm}^2/\\text{kg}^2\\)),
- \\(m_1\\) and \\(m_2\\) are the masses of the two objects,
- \\(r\\) is the distance between the centers.

### Surface Area Formula
\\[
A = 4 \\pi r^2
\\]

Some inline math: \\(E = mc^2\\) and \\(\\sigma = 5.67 \\times 10^{-8}\\).`;

console.log('=== MATHJAX TEST CONTENT ===');
console.log('Content length:', testContent.length);
console.log('Display math \\[...\\]:', (testContent.match(/\\\[[\s\S]*?\\\]/g) || []).length);
console.log('Inline math \\(...\\):', (testContent.match(/\\\(.*?\\\)/g) || []).length);

// Test preprocessing 
let processed = testContent;
processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$');
processed = processed.replace(/\\\((.*?)\\\)/g, '$$$1$$');

console.log('\n=== AFTER PREPROCESSING ===');
console.log('Display math $$...$$:', (processed.match(/\$\$[\s\S]*?\$\$/g) || []).length);
console.log('Inline math $...$:', (processed.match(/\$[^$]+\$/g) || []).length);
console.log('Sample conversion:');
console.log('Before: \\( F = G \\frac{m_1 m_2}{r^2} \\)');
console.log('After: $ F = G \\frac{m_1 m_2}{r^2} $');
