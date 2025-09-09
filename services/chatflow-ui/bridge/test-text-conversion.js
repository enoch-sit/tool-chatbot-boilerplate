// Test enhanced preprocessing with \text{} conversion
const testContent = `The gravitational constant is \\(6.674 × 10^{-11} \\, \\text{Nm}^2/\\text{kg}^2\\) and Stefan-Boltzmann constant is \\(5.67 × 10^{-8} \\, \\text{W/m}^2\\text{K}^4\\).`;

console.log('=== ENHANCED PREPROCESSING TEST ===');
console.log('Original:', testContent);
console.log('\\text{} patterns found:', (testContent.match(/\\text\{[^}]*\}/g) || []).join(', '));

// Apply enhanced preprocessing
let processed = testContent;
processed = processed.replace(/\\\((.*?)\\\)/g, (_, mathContent) => {
  let cleanContent = mathContent.replace(/×/g, '\\times');
  cleanContent = cleanContent.replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}');
  return `$${cleanContent}$`;
});

console.log('\nProcessed:', processed);
console.log('\\text{} remaining:', (processed.match(/\\text\{[^}]*\}/g) || []).length);
console.log('\\mathrm{} created:', (processed.match(/\\mathrm\{[^}]*\}/g) || []).length);

if (processed.includes('\\mathrm{')) {
  console.log('✅ SUCCESS: \\text{} converted to \\mathrm{}');
} else {
  console.log('❌ FAILED: No \\mathrm{} conversions found');
}
