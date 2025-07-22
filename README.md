# JS HAML

A simplified HAML-like template parser for JavaScript that converts HAML-style syntax into render functions.

## Features

- **Element creation** with `%tagname`
- **Class and ID shortcuts** like `%div.container#main`
- **Attributes** with `attr="value"` or dynamic expressions `attr={{ expression }}`
- **Text content** and **expressions** with `=`
- **Control flow** with `- if`, `- else`, `- else if`
- **Escaped text** with `\-`
- **Nested structures** via indentation

## Installation

```bash
npm install
# or
bun install
```

## Usage

```javascript
const JSHaml = require('./src/js_haml');

const jsHaml = new JSHaml();

// Define your template
const template = `
%div.container
  %h1= title
  
  %button onclick="handleClick()" disabled={{ !canClick }}
    Click me
  
  - if items.length > 0
    %ul
      - items.forEach(item => {
        %li= item
      - })
  - else
    %p No items found
`;

// Compile template to render function
const render = jsHaml.compile(template);

// Render with context
const html = render({
  title: 'My App',
  canClick: true,
  items: ['Apple', 'Banana', 'Orange'],
  handleClick: () => console.log('clicked')
});

console.log(html);
```

## Syntax Guide

### Elements
```haml
%div                  → <div></div>
%span Hello          → <span>Hello</span>
%p.text              → <p class="text"></p>
%div#main.container  → <div id="main" class="container"></div>
```

### Attributes
```haml
%a href="/home" Link                     → <a href="/home">Link</a>
%button disabled={{ count == 0 }} Save   → <button disabled>Save</button>
```

### Expressions
```haml
%span= user.name                → <span>John</span>
= "Total: " + count             → Total: 5
```

### Control Flow
```haml
- if loggedIn
  %p Welcome back!
- else
  %p Please log in

- if count > 10
  Too many
- else if count > 0
  Just right
- else
  None
```

### Escaping
```haml
\-                    → -
\\-                   → \-
```

### JavaScript Execution
```haml
- const x = 5        → (executes but returns nothing)
- items.push('new')  → (executes but returns nothing)
```

## Running Tests

```bash
npm test
# or
bun run test
```

## License

MIT