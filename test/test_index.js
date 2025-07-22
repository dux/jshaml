// Test script to verify index functionality in for loops

const testData = {
  outerLoop: ['apple', 'banana', 'orange'],
  innerLoop: ['red', 'green', 'blue'],
  matrix: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']]
};

console.log('Testing nested for loops with indices:\n');

// Test 1: Basic nested loops
console.log('Test 1: Basic nested loops');
testData.outerLoop.forEach((item, idx) => {
  console.log(`Outer: ${item} at index ${idx}`);
  testData.innerLoop.forEach((color, colorIdx) => {
    console.log(`  Inner: ${color} at index ${colorIdx} (outer item: ${item}[${idx}])`);
  });
});

console.log('\nTest 2: Matrix iteration');
testData.matrix.forEach((row, rowIdx) => {
  console.log(`Row ${rowIdx}:`);
  row.forEach((cell, colIdx) => {
    console.log(`  Cell ${cell} at position [${rowIdx},${colIdx}]`);
  });
});

console.log('\nExpected output format for HAML template:');
console.log('- Outer loop items should show: "Element: foo, Index: 0", "Element: bar, Index: 1", etc.');
console.log('- Each item should have data-index attribute set to its index');
console.log('- Items with index > 1 should have class "item-{index}"');