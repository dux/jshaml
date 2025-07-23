import JSHaml from '../src/haml.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const template = `%span= count`;
    const render = jsHaml.compile(template);
    const context = { count: 5 };
    expect(render(context)).toBe('<span>5</span>');
  });

  test('should handle attributes', () => {
    const template = `%button onclick="alert('hi')" class="btn"`;
    const render = jsHaml.compile(template);
    expect(render({})).toBe('<button onclick="alert(\'hi\')" class="btn"></button>');
  });

  test('should handle dynamic attributes with {{ }}', () => {
    const template = `%button disabled={{ count == 1 }}`;
    const render = jsHaml.compile(template);
    
    expect(render({ count: 1 })).toBe('<button disabled></button>');
    expect(render({ count: 2 })).toBe('<button></button>');
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
- if count > 0
  %span Positive`;
    const render = jsHaml.compile(template);
    
    expect(render({ count: 1 })).toBe('<span>Positive</span>');
    expect(render({ count: 0 })).toBe('');
  });

  test('should handle if-else chains', () => {
    const template = `
- if count == 0
  Zero
- else
  Not zero`;
    const render = jsHaml.compile(template);
    
    expect(render({ count: 0 })).toBe('Zero');
    expect(render({ count: 1 })).toBe('Not zero');
  });

  test('should handle nested if-else', () => {
    const template = `
- if count > 0
  - if count % 2
    odd
  - else
    even`;
    const render = jsHaml.compile(template);
    
    expect(render({ count: 3 })).toBe('odd');
    expect(render({ count: 4 })).toBe('even');
    expect(render({ count: 0 })).toBe('');
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
    const template = fs.readFileSync(path.join(__dirname, 'tpl', 'default.haml'), 'utf8');
    const render = jsHaml.compile(template);
    
    const context = {
      fez: {
        count: 5,
        more: () => {}
      },
      count: 5,
      isMax: () => false,
      MAX: 10
    };

    const result = render(context);
    expect(result).toContain('<button onclick="fez.count -= 1">-</button>');
    expect(result).toContain('<span>5</span>');
    expect(result).toContain('<button onclick="fez.more()" disabled>+</button>');
    expect(result).toContain('<span>&mdash;</span>');
    expect(result).toContain('odd');
  });

  test('should handle MAX condition', () => {
    const template = `
- if count == MAX
  MAX
- else
  Not MAX`;

    const render = jsHaml.compile(template);
    
    expect(render({ count: 10, MAX: 10 })).toBe('MAX');
    expect(render({ count: 5, MAX: 10 })).toBe('Not MAX');
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

  test('should handle for loops', () => {
    const template = `
- for item in items
  %li= item`;

    const render = jsHaml.compile(template);
    const result = render({ items: ['apple', 'banana', 'cherry'] });
    
    expect(result).toBe('<li>apple</li><li>banana</li><li>cherry</li>');
  });

  test('should handle for loops with dynamic attributes', () => {
    const template = `
- for el in [1,2,3]
  %span{ class: "foo-{{ el }}" }= el`;

    const render = jsHaml.compile(template);
    const result = render({});
    
    expect(result).toBe('<span class="foo-1">1</span><span class="foo-2">2</span><span class="foo-3">3</span>');
  });

  test('should handle div shorthand with .class', () => {
    const template = `.container
  %p Content`;

    const render = jsHaml.compile(template);
    const result = render({});
    
    expect(result).toBe('<div class="container"><p>Content</p></div>');
  });

  test('should handle div shorthand with #id', () => {
    const template = `#main`;

    const render = jsHaml.compile(template);
    const result = render({});
    
    expect(result).toBe('<div id="main"></div>');
  });

  test('should handle elsif as alias for else if', () => {
    const template = `
- if count == 1
  ONE
- elsif count == 2
  TWO
- else
  OTHER`;

    const render = jsHaml.compile(template);
    
    expect(render({count: 1})).toBe('ONE');
    expect(render({count: 2})).toBe('TWO');
    expect(render({count: 3})).toBe('OTHER');
  });

  test('should handle both "else if" and "elsif" in same template', () => {
    const template = `
- if count == 1
  ONE
- else if count == 2
  TWO
- elsif count == 3
  THREE
- else
  OTHER`;

    const render = jsHaml.compile(template);
    
    expect(render({count: 1})).toBe('ONE');
    expect(render({count: 2})).toBe('TWO');
    expect(render({count: 3})).toBe('THREE');
    expect(render({count: 4})).toBe('OTHER');
  });

  test('should handle multi-line attributes', () => {
    const template = `%span
  class="test"
  id="myspan"
  disabled={{ isDisabled }}`;

    const render = jsHaml.compile(template);
    const result = render({isDisabled: true});
    
    expect(result).toBe('<span class="test" id="myspan" disabled></span>');
  });

  test('should handle mixed inline and multi-line attributes', () => {
    const template = `%button onclick="click()"
  class="btn"
  disabled={{ disabled }}
  Click me`;

    const render = jsHaml.compile(template);
    const result = render({disabled: false});
    
    expect(result).toBe('<button onclick="click()" class="btn">Click me</button>');
  });

  test('should handle string interpolation with expressions in attributes', () => {
    const template = `%div
  %span class="foo-{{ 2 + 3 }}" Test
  %span data-count="{{ items.length }}-items"= items.length
  %span id="item-{{ itemId }}" Item`;

    const render = jsHaml.compile(template);
    const result = render({ items: ['a', 'b', 'c'], itemId: 42 });
    
    expect(result).toBe('<div><span class="foo-5">Test</span><span data-count="3-items">3</span><span id="item-42">Item</span></div>');
  });

  test('should handle complex expressions in string interpolation', () => {
    const template = `%div
  %a href="/user/{{ user.id }}/profile" View {{ user.name }}'s profile
  %span class="status-{{ user.active ? 'active' : 'inactive' }}" Status`;

    const render = jsHaml.compile(template);
    const result = render({ user: { id: 123, name: 'John', active: true } });
    
    expect(result).toBe('<div><a href="/user/123/profile">View John\'s profile</a><span class="status-active">Status</span></div>');
  });
});

// Run a simple test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const jsHaml = new JSHaml();
  
  const template = fs.readFileSync(path.join(__dirname, 'tpl', 'default.haml'), 'utf8');
  const render = jsHaml.compile(template);
  
  const context = {
    fez: {
      count: 5,
      more: () => console.log('more clicked')
    },
    count: 5,
    isMax: () => false,
    MAX: 10
  };

  console.log('Rendered output:');
  console.log(render(context));
}