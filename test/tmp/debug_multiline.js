const JSHaml = require('../../src/js_haml');

// Override parse method to add debug
const originalParse = JSHaml.prototype.parse;
JSHaml.prototype.parse = function(template) {
  console.log('=== PARSING TEMPLATE ===');
  console.log(template);
  console.log('========================');
  
  const lines = template.split('\n');
  const ast = [];
  const stack = [{ children: ast, indent: -1 }];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue; // Skip empty lines
    
    const indent = this.getIndent(line);
    const trimmed = line.trim();
    
    console.log(`Line ${index}: indent=${indent}, trimmed="${trimmed}"`);
    
    // Pop stack items until we find the parent
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    console.log(`Parent has ${parent.children.length} children`);
    
    // Check if this looks like a multi-line attribute for the parent element
    if (this.isMultiLineAttribute(trimmed) && stack.length > 1) {
      const parentElement = stack[stack.length - 1].node;
      console.log(`Is multi-line attr: ${this.isMultiLineAttribute(trimmed)}, parentElement.type: ${parentElement?.type}, indent ${indent} > parentElement.indent ${parentElement?.indent}?`);
      
      if (parentElement && parentElement.type === 'element' && indent > parentElement.indent) {
        console.log('PROCESSING MULTI-LINE ATTRIBUTES');
        // This is a multi-line attribute, collect all consecutive attribute lines
        const attributeLines = [];
        let currentIndex = index;
        
        while (currentIndex < lines.length) {
          const attrLine = lines[currentIndex];
          if (!attrLine.trim()) {
            currentIndex++;
            continue;
          }
          
          const attrIndent = this.getIndent(attrLine);
          const attrTrimmed = attrLine.trim();
          
          if (attrIndent === indent && this.isMultiLineAttribute(attrTrimmed)) {
            console.log(`Adding attribute line: "${attrTrimmed}"`);
            attributeLines.push(attrTrimmed);
            currentIndex++;
          } else {
            break;
          }
        }
        
        console.log('Collected attribute lines:', attributeLines);
        
        // Parse and merge these attributes into the parent element
        this.mergeMultiLineAttributes(parentElement, attributeLines);
        
        console.log('Element after merge:', JSON.stringify(parentElement.attributes, null, 2));
        
        // Skip the processed lines
        index = currentIndex - 1;
        continue;
      }
    }
    
    const node = this.parseLine(trimmed);
    console.log('Parsed node:', node?.type);
    
    if (node) {
      node.indent = indent;
      parent.children.push(node);
      
      if (node.type === 'element' || node.type === 'if' || node.type === 'else' || node.type === 'else-if' || node.type === 'for') {
        stack.push({ children: node.children || [], indent, node });
      }
    }
  }

  return ast;
};

const jsHaml = new JSHaml();
const template = '%span\n  multy="1"\n  line={{ 3 + 4 }}';
const ast = jsHaml.parse(template);
console.log('\n=== FINAL AST ===');
console.log(JSON.stringify(ast, null, 2));