const pair = 'class={{ el > 2 ? `foo-${el}` : null }}';
console.log('Processing pair:', pair);

// Find separator
let separatorIndex = -1;
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
    else if ((char === ':' || char === '=') && pairBraceDepth === 0 && separatorIndex === -1) {
      separatorIndex = i;
      console.log('Found separator at index', i);
      break;
    }
  }
}

console.log('separatorIndex:', separatorIndex);

if (separatorIndex !== -1) {
  const key = pair.substring(0, separatorIndex).trim();
  let value = pair.substring(separatorIndex + 1).trim();
  
  console.log('key:', key);
  console.log('value:', value);
}