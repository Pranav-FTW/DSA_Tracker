import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm as turndownGfm } from 'turndown-plugin-gfm';
import Prism from 'prismjs';

// Load Prism language components
import 'prismjs/components/prism-clike.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-java.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-rust.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-json.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const LANG_MAP = {
  py: 'python',
  python: 'python',
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  java: 'java',
  golang: 'go',
  go: 'go',
  rust: 'rust',
  rs: 'rust',
  sql: 'sql',
  bash: 'bash',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash',
  json: 'json',
  html: 'markup',
  xml: 'markup',
  css: 'css',
};

const LANG_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  go: 'Go',
  rust: 'Rust',
  sql: 'SQL',
  bash: 'Bash',
  json: 'JSON',
  markup: 'HTML/XML',
  css: 'CSS',
};

function getPrismGrammar(lang) {
  const norm = LANG_MAP[lang] || lang;
  return Prism.languages[norm] || null;
}

function getLangLabel(lang) {
  const norm = LANG_MAP[lang] || lang;
  return LANG_LABELS[norm] || norm || 'code';
}

// Configure Marked
const markedInstance = new Marked({
  gfm: true,
  breaks: true,
});

markedInstance.use({
  renderer: {
    code({ text, lang }) {
      const language = (lang || '').trim().toLowerCase();
      const grammar = getPrismGrammar(language);
      const highlighted = grammar ? Prism.highlight(text, grammar, language) : escapeHtml(text);
      const langLabel = getLangLabel(language);
      const encoded = encodeURIComponent(text);

      return `<div class="md-code-block" data-lang="${escapeHtml(language)}">
  <div class="md-code-header">
    <span class="md-code-lang">${escapeHtml(langLabel)}</span>
    <button type="button" class="md-copy-btn" data-code="${encoded}" title="Copy code" aria-label="Copy code">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      <span>Copy</span>
    </button>
  </div>
  <pre class="md-code-pre"><code class="language-${escapeHtml(language || 'plaintext')}">${highlighted}</code></pre>
</div>`;
    },
    link({ href, title, text }) {
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${t}>${text}</a>`;
    },
    table({ header, rows }) {
      return `<div class="md-table-wrap"><table><thead>${header}</thead><tbody>${rows}</tbody></table></div>`;
    },
  },
});

function sanitizeHtml(html, options) {
  if (typeof window !== 'undefined') {
    const purify = DOMPurify && typeof DOMPurify.sanitize === 'function' ? DOMPurify : typeof DOMPurify === 'function' ? DOMPurify(window) : null;
    if (purify && typeof purify.sanitize === 'function') {
      return purify.sanitize(html, options);
    }
  }
  return html;
}

/**
 * Renders Markdown string to sanitized HTML.
 */
export function renderMarkdown(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') return '';
  try {
    const rawHtml = markedInstance.parse(markdownText);
    const sanitized = sanitizeHtml(rawHtml, {
      ADD_TAGS: ['svg', 'path', 'rect', 'button'],
      ADD_ATTR: [
        'target',
        'rel',
        'data-code',
        'data-lang',
        'aria-label',
        'viewBox',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
      ],
    });
    return sanitized;
  } catch (err) {
    console.error('Markdown rendering error:', err);
    return `<p>${escapeHtml(markdownText)}</p>`;
  }
}

// Turndown HTML-to-Markdown Service
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});

turndownService.use(turndownGfm);

// Custom rule for code blocks (especially ChatGPT & LeetCode copy-paste)
turndownService.addRule('fencedCodeBlockWithLang', {
  filter: (node) => {
    return (
      (node.nodeName === 'PRE' && node.querySelector('code')) ||
      (node.nodeName === 'DIV' && node.classList && node.classList.contains('highlight'))
    );
  },
  replacement: (content, node) => {
    const codeNode = node.querySelector('code') || node;
    const className = (codeNode.className || '') + ' ' + (node.className || '');
    const match = className.match(/(?:language|lang)-(\w+)/i);
    const lang = match ? match[1].toLowerCase() : '';
    const text = codeNode.textContent || '';
    return `\n\n\`\`\`${lang}\n${text.replace(/\n$/, '')}\n\`\`\`\n\n`;
  },
});

/**
 * Converts rich HTML string to clean Markdown
 */
export function htmlToMarkdown(htmlString) {
  if (!htmlString || typeof htmlString !== 'string') return '';
  try {
    return turndownService.turndown(htmlString).trim();
  } catch (err) {
    console.error('HTML to Markdown error:', err);
    return '';
  }
}

/**
 * Checks whether HTML string contains rich markup worthy of conversion
 */
export function isRichHtml(html) {
  if (!html || typeof html !== 'string') return false;
  const richPattern = /<(h[1-6]|pre|code|table|thead|tbody|tr|td|th|ul|ol|li|blockquote|strong|em|b|i|hr|a\s+href)[^>]*>/i;
  return richPattern.test(html);
}

/**
 * Detects whether plain text already contains markdown formatting
 */
export function looksLikeMarkdown(text) {
  if (!text || typeof text !== 'string') return false;
  const mdIndicators = [
    /^#{1,6}\s+/m,
    /```[\s\S]*?```/,
    /^[-*+]\s+/m,
    /^\d+\.\s+/m,
    /\*\*[^*]+\*\*/,
    /`[^`\n]+`/,
    /^>\s+/m,
    /\[[^\]]+\]\([^)]+\)/,
    /\|.+\|.+\|/,
  ];
  return mdIndicators.some((pattern) => pattern.test(text));
}

/**
 * Strips markdown formatting for clean one-line previews in table rows
 */
export function stripMarkdown(text, maxLength = 80) {
  if (!text || typeof text !== 'string') return '';
  const clean = text
    .replace(/```[\s\S]*?```/g, (match) => {
      const inner = match.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
      const firstLine = inner.split('\n')[0] || '';
      return firstLine ? `[${firstLine.slice(0, 24).trim()}…]` : '[code]';
    })
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length > maxLength) {
    return clean.slice(0, maxLength).trim() + '…';
  }
  return clean;
}

export const DSA_TEMPLATES = [
  {
    id: 'solution',
    label: 'Full Solution (Approach + Complexity + Code)',
    template: `### 💡 Intuition & Approach
- 

### ⏱️ Complexity
- **Time:** $O(N)$
- **Space:** $O(1)$

### 💻 Code
\`\`\`python
class Solution:
    def solve(self):
        pass
\`\`\`

### ⚠️ Edge Cases
- `,
  },
  {
    id: 'quick',
    label: 'Quick Key Takeaway',
    template: `### 🎯 Key Takeaway
- **Pattern:** 
- **Time/Space:** $O(N)$ / $O(1)$
- **Crucial trick:** `,
  },
  {
    id: 'complexity',
    label: 'Complexity Analysis',
    template: `- **Time Complexity:** $O(N)$ - because 
- **Space Complexity:** $O(1)$ - auxiliary memory`,
  },
];
