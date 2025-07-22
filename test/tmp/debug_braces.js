const remainingLine = '{ class={{ el > 2 ? `foo-${el}` : null }} }= el';
const trimmedLine = remainingLine.trim();
console.log('trimmedLine:', trimmedLine);
console.log('starts with {:', trimmedLine.startsWith('{'));

// Test the brace matching logic
let braceCount = 0;
let endIndex = -1;

for (let i = 0; i < trimmedLine.length; i++) {
  const char = trimmedLine[i];
  console.log('i=' + i + ', char=' + char + ', braceCount=' + braceCount);
  if (char === '{') braceCount++;
  if (char === '}') {
    braceCount--;
    if (braceCount === 0) {
      endIndex = i;
      break;
    }
  }
}

console.log('endIndex:', endIndex);
if (endIndex !== -1) {
  console.log('attrString:', trimmedLine.substring(1, endIndex));
}