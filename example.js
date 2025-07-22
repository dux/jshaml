const JSHaml = require('./src/js_haml');

const jsHaml = new JSHaml();

// Example template
const template = `
%div.container
  %h1 Counter Example
  
  %button onclick="fez.state.count -= 1" disabled={{ state.count == 1 }}
    \\-
  %span.count = state.count
  %button onclick="fez.more()" disabled={{ isMax() }}
    +
  
  - if state.count > 0
    %div.status
      %span Status: &nbsp;
      
      - if state.count == MAX
        %strong MAX REACHED
      - else
        - if state.count % 2
          %em odd number
        - else
          %em even number
`;

// Compile the template
const render = jsHaml.compile(template);

// Example contexts
const contexts = [
  {
    fez: {
      state: { count: 1 },
      more: () => console.log('more clicked')
    },
    state: { count: 1 },
    isMax: () => false,
    MAX: 10
  },
  {
    fez: {
      state: { count: 5 },
      more: () => console.log('more clicked')
    },
    state: { count: 5 },
    isMax: () => false,
    MAX: 10
  },
  {
    fez: {
      state: { count: 10 },
      more: () => console.log('more clicked')
    },
    state: { count: 10 },
    isMax: () => true,
    MAX: 10
  }
];

// Render with different contexts
console.log('=== Count: 1 (minimum) ===');
console.log(render(contexts[0]));

console.log('\n=== Count: 5 (odd) ===');
console.log(render(contexts[1]));

console.log('\n=== Count: 10 (MAX) ===');
console.log(render(contexts[2]));