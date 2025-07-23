# JS HAML

BETA! 95% Vibe coded

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
npm install @dinoreic/haml
```

## Usage

```javascript
import JSHaml from '@dinoreic/haml';
// or CommonJS: const JSHaml = require('@dinoreic/haml');

const jsHaml = new JSHaml();

// Define your template
const template = `
.container
  %h1= title

  %button onclick="alert('clicked!')" disabled={{ !canClick }}
    Click me

  %div class="foo-{{ 2 + 3 }}" data-count="{{ items.length }}-items"
    Mixed expressions in attributes

  - if items.length > 0
    %ul
      - for item, index in items
        %li class="item-{{ index + 1 }}"
          %span.index= index + 1
          %smpan.mx-3 &mdash;
          %span.item= item
  - else
    %p No items found
`;

// Compile template to render function
const render = jsHaml.compile(template);

// Render with context
const html = render({
  title: 'My Demo App',
  canClick: true,
  items: ['Apple', 'Banana', 'Cherry', 'Date']
});

console.log(html);
```

**Output:**
```html
<div class="container">
  <h1>My Demo App</h1>
  <button onclick="alert('clicked!')">Click me</button>
  <div class="foo-5" data-count="4-items">Mixed expressions in attributes</div>
  <ul>
    <li class="item-1">
      <span class="index">1</span>
      <smpan class="mx-3">&mdash;</smpan>
      <span class="item">Apple</span>
    </li>
    <li class="item-2">
      <span class="index">2</span>
      <smpan class="mx-3">&mdash;</smpan>
      <span class="item">Banana</span>
    </li>
    <li class="item-3">
      <span class="index">3</span>
      <smpan class="mx-3">&mdash;</smpan>
      <span class="item">Cherry</span>
    </li>
    <li class="item-4">
      <span class="index">4</span>
      <smpan class="mx-3">&mdash;</smpan>
      <span class="item">Date</span>
    </li>
  </ul>
</div>
```

## Complex Example

```javascript
import JSHaml from '@dinoreic/haml';

const jsHaml = new JSHaml();

const blogTemplate = `
%article.blog-post
  %header.post-header
    %h1.post-title= post.title
    %div.post-meta
      %span.author By {{ post.author }}
      %time.published datetime={{ post.date }} {{ formatDate(post.date) }}
      - if post.tags && post.tags.length > 0
        %div.tags
          - for tag in post.tags
            %span.tag data-tag={{ tag }}= tag

  %div.post-content
    - for paragraph in post.paragraphs
      - if paragraph.type === 'text'
        %p= paragraph.content
      - else if paragraph.type === 'quote'
        %blockquote.quote
          %p= paragraph.content
          - if paragraph.author
            %cite= paragraph.author
      - else if paragraph.type === 'code'
        %pre
          %code class={{ paragraph.language }}= paragraph.content

  %footer.post-footer
    - if post.likes > 0
      %div.likes
        %span.like-icon ❤️
        %span.like-count= post.likes
    - if comments && comments.length > 0
      %section.comments
        %h3 Comments ({{ comments.length }})
        - for comment in comments
          %div.comment
            %strong.comment-author= comment.author
            %p.comment-text= comment.text
    - else
      %p.no-comments No comments yet
`;

const render = jsHaml.compile(blogTemplate);

const html = render({
  post: {
    title: "Getting Started with JS HAML",
    author: "Jane Developer",
    date: "2023-12-01",
    tags: ["javascript", "templates", "haml"],
    likes: 42,
    paragraphs: [
      { type: 'text', content: 'HAML is a great way to write clean templates.' },
      { type: 'quote', content: 'Code is poetry.', author: 'Anonymous' },
      { type: 'code', content: 'const x = 5;', language: 'javascript' }
    ]
  },
  comments: [
    { author: 'Bob', text: 'Great tutorial!' },
    { author: 'Alice', text: 'Very helpful, thanks!' }
  ],
  formatDate: (date) => new Date(date).toLocaleDateString()
});

console.log(html);
```

**Output:**
```html
<article class="blog-post">
  <header class="post-header">
    <h1 class="post-title">Getting Started with JS HAML</h1>
    <div class="post-meta">
      <span class="author">By Jane Developer</span>
      <time class="published" datetime="2023-12-01">12/1/2023</time>
      <div class="tags">
        <span class="tag" data-tag="javascript">javascript</span>
        <span class="tag" data-tag="templates">templates</span>
        <span class="tag" data-tag="haml">haml</span>
      </div>
    </div>
  </header>
  <div class="post-content">
    <p>HAML is a great way to write clean templates.</p>
    <blockquote class="quote">
      <p>Code is poetry.</p>
      <cite>Anonymous</cite>
    </blockquote>
    <pre><code class="javascript">const x = 5;</code></pre>
  </div>
  <footer class="post-footer">
    <div class="likes">
      <span class="like-icon">❤️</span>
      <span class="like-count">42</span>
    </div>
    <section class="comments">
      <h3>Comments (2)</h3>
      <div class="comment">
        <strong class="comment-author">Bob</strong>
        <p class="comment-text">Great tutorial!</p>
      </div>
      <div class="comment">
        <strong class="comment-author">Alice</strong>
        <p class="comment-text">Very helpful, thanks!</p>
      </div>
    </section>
  </footer>
</article>
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
