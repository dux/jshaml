const JSHaml = require('../../src/js_haml');

// Create a modified version for debugging
const originalCode = `
      // First check for curly brace attributes { attr: "value" }
      let curlyAttributes = {};
      let afterCurlyIndex = 0;
      
      // Find matching closing brace, accounting for nested braces
      const trimmedLine = remainingLine.trim();
      if (trimmedLine.startsWith('{')) {
        console.log('DEBUG: Found curly braces');
        let braceCount = 0;
        let endIndex = -1;
        
        for (let i = 0; i < trimmedLine.length; i++) {
          if (trimmedLine[i] === '{') braceCount++;
          if (trimmedLine[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }
        }
        
        if (endIndex !== -1) {
          const attrString = trimmedLine.substring(1, endIndex).trim();
          afterCurlyIndex = remainingLine.indexOf('{') + endIndex + 1;
          console.log('DEBUG: attrString =', attrString);
          
          // Smart split on commas...
          const attrPairs = [];
          // ... (full parsing logic here)
          
          console.log('DEBUG: curlyAttributes =', curlyAttributes);
        }
      }
      
      console.log('DEBUG: Final curlyAttributes =', curlyAttributes);
      
      // Parse regular attributes and find where content starts
      const remainingAfterCurly = remainingLine.substring(afterCurlyIndex);
      const { attributes, contentStartIndex } = this.parseElementAttributes(remainingAfterCurly);
      
      console.log('DEBUG: Regular attributes =', attributes);
      
      // Merge curly attributes with regular attributes
      Object.assign(attributes, curlyAttributes);
      
      console.log('DEBUG: Merged attributes =', attributes);
`;

// Since I can't easily patch the code, let me manually test the logic
const remainingLine = '{ class={{ el > 2 ? `foo-${el}` : null }} }= el';

let curlyAttributes = {};
let afterCurlyIndex = 0;

const trimmedLine = remainingLine.trim();
console.log('trimmedLine starts with {:', trimmedLine.startsWith('{'));

if (trimmedLine.startsWith('{')) {
  console.log('DEBUG: Found curly braces');
  let braceCount = 0;
  let endIndex = -1;
  
  for (let i = 0; i < trimmedLine.length; i++) {
    if (trimmedLine[i] === '{') braceCount++;
    if (trimmedLine[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (endIndex !== -1) {
    const attrString = trimmedLine.substring(1, endIndex).trim();
    afterCurlyIndex = remainingLine.indexOf('{') + endIndex + 1;
    console.log('DEBUG: attrString =', attrString);
    
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
    
    console.log('DEBUG: attrPairs =', attrPairs);
    
    for (const pair of attrPairs) {
      // Find separator
      let separatorIndex = -1;
      let pairBraceDepth = 0;
      let pairInBackticks = false;
      
      for (let i = 0; i < pair.length; i++) {
        const char = pair[i];
        if (char === '`') {
          pairInBackticks = !pairInBackticks;
        } else if (!pairInBackticks) {
          if (char === '{') pairBraceDepth++;
          else if (char === '}') pairBraceDepth--;
          else if ((char === ':' || char === '=') && pairBraceDepth === 0 && separatorIndex === -1) {
            separatorIndex = i;
            break;
          }
        }
      }
      
      if (separatorIndex !== -1) {
        const key = pair.substring(0, separatorIndex).trim();
        let value = pair.substring(separatorIndex + 1).trim();
        
        console.log('DEBUG: Processing key =', key, 'value =', value);
        
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Check if value contains {{ }} expressions
        if (value.includes('{{') && value.includes('}}')) {
          // Check if entire value is a single {{ expression }}
          if (value.startsWith('{{') && value.endsWith('}}')) {
            // Extract everything between the outer {{ and }}
            const expr = value.substring(2, value.length - 2).trim();
            curlyAttributes[key] = { type: 'expression', value: expr };
            console.log('DEBUG: Added expression attribute:', key, '=', expr);
          } else {
            // Complex case: string with embedded {{ }} expressions
            const processedValue = value.replace(/\\{\\{\\s*([^}]+)\\s*\\}\\}/g, (match, expr) => {
              return `" + (${expr}) + "`;
            });
            curlyAttributes[key] = { type: 'expression', value: `"${processedValue}"` };
          }
        } else {
          curlyAttributes[key] = value;
        }
      }
    }
    
    console.log('DEBUG: Final curlyAttributes =', curlyAttributes);
  }
}

console.log('Final result curlyAttributes:', curlyAttributes);