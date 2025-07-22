const attrString = 'class={{ el > 2 ? `foo-${el}` : null }}';
console.log('attrString:', attrString);

// Smart split on commas
const attrPairs = [];
let currentPair = '';
let braceDepth = 0;
let inBackticks = false;

for (let i = 0; i < attrString.length; i++) {
  const char = attrString[i];
  if (char === '`') {
    inBackticks = !inBackticks;
  } else if (!inBackticks) {
    if (char === '{') braceDepth++;
    else if (char === '}') braceDepth--;
  }
  
  if (char === ',' && braceDepth === 0 && !inBackticks) {
    attrPairs.push(currentPair.trim());
    currentPair = '';
  } else {
    currentPair += char;
  }
}

if (currentPair.trim()) {
  attrPairs.push(currentPair.trim());
}

console.log('attrPairs:', attrPairs);

// Process the first (and only) pair
const pair = attrPairs[0];
console.log('Processing pair:', pair);

// Find colon
let colonIndex = -1;
let pairBraceDepth = 0;
let pairInBackticks = false;

for (let i = 0; i < pair.length; i++) {
  const char = pair[i];
  console.log(`i=${i}, char='${char}', braceDepth=${pairBraceDepth}, inBackticks=${pairInBackticks}`);
  if (char === '`') {
    pairInBackticks = !pairInBackticks;
  } else if (!pairInBackticks) {
    if (char === '{') pairBraceDepth++;
    else if (char === '}') pairBraceDepth--;
    else if (char === ':' && pairBraceDepth === 0 && colonIndex === -1) {
      colonIndex = i;
      console.log('Found colon at index', i);
      break;
    }
  }
}

console.log('colonIndex:', colonIndex);

if (colonIndex !== -1) {
  const key = pair.substring(0, colonIndex).trim();
  let value = pair.substring(colonIndex + 1).trim();
  
  console.log('key:', key);
  console.log('value:', value);
  
  // Check for {{ }} expressions
  if (value.includes('{{') && value.includes('}}')) {
    if (value.startsWith('{{') && value.endsWith('}}')) {
      const expr = value.substring(2, value.length - 2).trim();
      console.log('Expression attribute:', { key, type: 'expression', value: expr });
    }
  }
}