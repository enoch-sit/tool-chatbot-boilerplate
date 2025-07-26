// Test file to verify math rendering with your sample content

const sampleContent = `Of course! In primary school, children learn various fundamental math concepts, which include simple formulas and operations predominantly related to arithmetic, geometry, and basic number properties. Here are some commonly taught math formulas in primary school:

### **Arithmetic Formulas**
1. **Addition and Subtraction**:
   - There may not be specific formulas, but learners often understand basic relationships like:
     - Commutative Property: \\( a + b = b + a \\)
     - Associative Property: \\( (a + b) + c = a + (b + c) \\)

2. **Multiplication**:
   - Commutative Property: \\( a \\times b = b \\times a \\)
   - Associative Property: \\( (a \\times b) \\times c = a \\times (b \\times c) \\)
   - Distributive Property: \\( a \\times (b + c) = (a \\times b) + (a \\times c) \\)

3. **Division**:
   - Division relationship with multiplication: \\( a \\div b = c \\) means \\( a = b \\times c \\)

### **Area Formulas** (Geometry Basics)
1. **Area of a Rectangle**:
   - \\( \\text{Area} = \\text{Length} \\times \\text{Width} \\)

2. **Area of a Square**:
   - \\( \\text{Area} = \\text{Side} \\times \\text{Side} \\) or \\( \\text{Area} = \\text{Side}^2 \\)

3. **Area of a Triangle**:
   - \\( \\text{Area} = \\frac{1}{2} \\times \\text{Base} \\times \\text{Height} \\)

4. **Area of a Circle** (introduced sometimes in the later years of primary school):
   - \\( \\text{Area} = \\pi \\times \\text{Radius}^2 \\)

### **Perimeter Formulas** (Geometry Basics)
1. **Perimeter of a Rectangle**:
   - \\( \\text{Perimeter} = 2 \\times (\\text{Length} + \\text{Width}) \\)

2. **Perimeter of a Square**:
   - \\( \\text{Perimeter} = 4 \\times \\text{Side} \\)

3. **Perimeter of a Triangle**:
   - \\( \\text{Perimeter} = \\text{Side}_1 + \\text{Side}_2 + \\text{Side}_3 \\)

### **Basic Fractions**
1. **Fraction Addition/Subtraction** (if denominators are the same):
   - \\( \\frac{a}{b} + \\frac{c}{b} = \\frac{a+c}{b} \\)
   - \\( \\frac{a}{b} - \\frac{c}{b} = \\frac{a-c}{b} \\)

2. **Fraction Multiplication**:
   - \\( \\frac{a}{b} \\times \\frac{c}{d} = \\frac{a \\times c}{b \\times d} \\)

3. **Fraction Division**:
   - \\( \\frac{a}{b} \\div \\frac{c}{d} = \\frac{a}{b} \\times \\frac{d}{c} \\)

### **Basic Measurement Concepts**
1. **Time Conversion**:
   - \\( 1 \\, \\text{hour} = 60 \\, \\text{minutes} \\)
   - \\( 1 \\, \\text{minute} = 60 \\, \\text{seconds} \\)

2. **Distance Conversion**:
   - \\( 1 \\, \\text{kilometer} = 1000 \\, \\text{meters} \\)
   - \\( 1 \\, \\text{meter} = 100 \\, \\text{centimeters} \\)

### **Patterns and Numbers**
1. **Sum of Consecutive Numbers**:
   - \\( \\text{Sum} = \\frac{\\text{n} \\times (\\text{n} + 1)}{2} \\), where \\( \\text{n} \\) is the largest number in the consecutive sequence. (Often introduced in advanced primary levels.)

### **Math in Tables Example**

| Shape | Area Formula | Perimeter Formula |
|-------|--------------|-------------------|
| Circle | $$\\pi r^2$$ | $$2\\pi r$$ |
| Rectangle | $$l \\times w$$ | $$2(l + w)$$ |
| Triangle | $$\\frac{1}{2}bh$$ | $$a + b + c$$ |
| Square | $$s^2$$ | $$4s$$ |

Some inline math in text: The equation $E = mc^2$ is famous, and $\\frac{1}{2}mv^2$ represents kinetic energy.
`;

// Test patterns
console.log('=== MATH PATTERN DETECTION TEST ===');
console.log('Content length:', sampleContent.length);
console.log('Inline LaTeX \\(...\\):', (sampleContent.match(/\\\(.*?\\\)/g) || []).length);
console.log('Inline dollar $...$:', (sampleContent.match(/\$[^$]+\$/g) || []).length);
console.log('Display LaTeX \\[...\\]:', (sampleContent.match(/\\\[[\s\S]*?\\\]/g) || []).length);
console.log('Display dollar $$...$$:', (sampleContent.match(/\$\$[\s\S]*?\$\$/g) || []).length);
console.log('Contains tables:', /\|.*\|/.test(sampleContent));
console.log('Contains code blocks:', /```/.test(sampleContent));

// Test preprocessing
let processed = sampleContent;
processed = processed.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
processed = processed.replace(/\\\[([\s\S]*?)\\\]/gs, '$$$$$$1$$$$');

console.log('\n=== AFTER PREPROCESSING ===');
console.log('Inline LaTeX \\(...\\):', (processed.match(/\\\(.*?\\\)/g) || []).length);
console.log('Inline dollar $...$:', (processed.match(/\$[^$]+\$/g) || []).length);
console.log('Display LaTeX \\[...\\]:', (processed.match(/\\\[[\s\S]*?\\\]/g) || []).length);
console.log('Display dollar $$...$$:', (processed.match(/\$\$[\s\S]*?\$\$/g) || []).length);

console.log('\n=== SAMPLE TRANSFORMATIONS ===');
console.log('Before: \\( a + b = b + a \\)');
console.log('After: $a + b = b + a$');
console.log('Table math preserved: $$\\pi r^2$$');
