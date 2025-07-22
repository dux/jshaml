const JSHaml = require('../../src/js_haml');

// Override the parseLine method to add debug
const originalParseLine = JSHaml.prototype.parseLine;
JSHaml.prototype.parseLine = function(line) {
  console.log('\n=== PARSING LINE ===');
  console.log('Input:', line);
  
  const result = originalParseLine.call(this, line);
  
  console.log('Result attributes:', JSON.stringify(result?.attributes, null, 2));
  console.log('==================\n');
  
  return result;
};

const jsHaml = new JSHaml();
const template = '%span.bar.baz{ class={{ el > 2 ? `foo-${el}` : null }} }= el';
const ast = jsHaml.parseLine(template);
console.log('Final AST attributes:', JSON.stringify(ast.attributes, null, 2));