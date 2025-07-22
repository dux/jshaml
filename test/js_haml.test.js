const JSHaml = require('../src/js_haml');
const fs = require('fs');
const path = require('path');

describe('JSHaml', () => {
  let jsHaml;

  beforeEach(() => {
    jsHaml = new JSHaml();
  });

  test('should parse and render basic elements', () => {
    const template = `%div`;
    const render = jsHaml.compile(template);
    expect(render({})).toBe('<div></div>');
  });

  test('should handle escaped dash', () => {
    const template = `\\-`;
    const render = jsHaml.compile(template);
    expect(render({})).toBe('-');
  });

  test('should render expressions with =', () => {
    const template = `%span= state.count`;
    const render = jsHaml.compile(template);
    const context = { state: { count: 5 } };
    expect(render(context)).toBe('<span>5</span>');
  });

  test('should handle attributes', () => {
    const template = `%button onclick="alert('hi')" class="btn"`;
    const render = jsHaml.compile(template);
    expect(render({})).toBe('<button onclick="alert(\'hi\')" class="btn"></button>');
  });

  test('should handle dynamic attributes with {{ }}', () => {
    const template = `%button disabled={{ state.count == 1 }}`;
    const render = jsHaml.compile(template);
    
    expect(render({ state: { count: 1 } })).toBe('<button disabled></button>');
    expect(render({ state: { count: 2 } })).toBe('<button></button>');
  });

  test('should handle nested elements', () => {
    const template = `
%div
  %span Hello
  %button Click`;
    const render = jsHaml.compile(template);
    expect(render({})).toBe('<div><span>Hello</span><button>Click</button></div>');
  });

  test('should handle if conditions', () => {
    const template = `
- if state.count > 0
  %span Positive`;
    const render = jsHaml.compile(template);
    
    expect(render({ state: { count: 1 } })).toBe('<span>Positive</span>');
    expect(render({ state: { count: 0 } })).toBe('');
  });

  test('should handle if-else chains', () => {
    const template = `
- if state.count == 0
  Zero
- else
  Not zero`;
    const render = jsHaml.compile(template);
    
    expect(render({ state: { count: 0 } })).toBe('Zero');
    expect(render({ state: { count: 1 } })).toBe('Not zero');
  });

  test('should handle nested if-else', () => {
    const template = `
- if state.count > 0
  - if state.count % 2
    odd
  - else
    even`;
    const render = jsHaml.compile(template);
    
    expect(render({ state: { count: 3 } })).toBe('odd');
    expect(render({ state: { count: 4 } })).toBe('even');
    expect(render({ state: { count: 0 } })).toBe('');
  });

  test('should execute JS code but return empty string', () => {
    const template = `
- const x = 5
%span= x`;
    const render = jsHaml.compile(template);
    // JS execution doesn't affect the output directly
    expect(render({})).toBe('<span></span>');
  });

  test('should handle the complete example', () => {
    const template = fs.readFileSync(path.join(__dirname, 'tpl', 'default.txt'), 'utf8');
    const render = jsHaml.compile(template);
    
    const context = {
      fez: {
        state: { count: 5 },
        more: () => {}
      },
      state: { count: 5 },
      isMax: () => false,
      MAX: 10
    };

    const result = render(context);
    expect(result).toContain('<button onclick="fez.state.count -= 1">-</button>');
    expect(result).toContain('<span>5</span>');
    expect(result).toContain('<button onclick="fez.more()">+</button>');
    expect(result).toContain('<span>&mdash;</span>');
    expect(result).toContain('odd');
  });

  test('should handle MAX condition', () => {
    const template = `
- if state.count == MAX
  MAX
- else
  Not MAX`;

    const render = jsHaml.compile(template);
    
    expect(render({ state: { count: 10 }, MAX: 10 })).toBe('MAX');
    expect(render({ state: { count: 5 }, MAX: 10 })).toBe('Not MAX');
  });

  test('should handle mixed content', () => {
    const template = `
%div
  Text content
  %span= value
  More text`;

    const render = jsHaml.compile(template);
    const result = render({ value: 'Hello' });
    
    expect(result).toBe('<div>Text content<span>Hello</span>More text</div>');
  });
});

// Run a simple test if executed directly
if (require.main === module) {
  const jsHaml = new JSHaml();
  
  const template = fs.readFileSync(path.join(__dirname, 'tpl', 'default.txt'), 'utf8');
  const render = jsHaml.compile(template);
  
  const context = {
    fez: {
      state: { count: 5 },
      more: () => console.log('more clicked')
    },
    state: { count: 5 },
    isMax: () => false,
    MAX: 10
  };

  console.log('Rendered output:');
  console.log(render(context));
}