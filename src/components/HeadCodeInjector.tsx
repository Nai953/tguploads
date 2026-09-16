import React, { useEffect } from 'react';

interface HeadCodeInjectorProps {
  code?: string;
}

export const HeadCodeInjector: React.FC<HeadCodeInjectorProps> = ({ code }) => {
  useEffect(() => {
    // 1. Remove previous custom injected head tags
    const existingInjected = document.head.querySelectorAll('[data-tg-injected="head-code"]');
    existingInjected.forEach(el => el.remove());

    if (!code || !code.trim()) {
      return;
    }

    try {
      // 2. Parse the HTML snippet
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'text/html');
      
      // Combine elements from parsed head and body
      const elementsToInject = [
        ...Array.from(doc.head.children),
        ...Array.from(doc.body.children)
      ];

      elementsToInject.forEach((node, idx) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        if (tagName === 'script') {
          // Create real script element so the browser executes it
          const scriptEl = document.createElement('script');
          scriptEl.setAttribute('data-tg-injected', 'head-code');
          scriptEl.setAttribute('data-index', String(idx));

          Array.from(el.attributes).forEach(attr => {
            scriptEl.setAttribute(attr.name, attr.value);
          });

          if (el.innerHTML) {
            scriptEl.text = el.innerHTML;
          }

          document.head.appendChild(scriptEl);
        } else {
          // For meta, link, style, etc.
          const cloned = el.cloneNode(true) as HTMLElement;
          cloned.setAttribute('data-tg-injected', 'head-code');
          cloned.setAttribute('data-index', String(idx));
          document.head.appendChild(cloned);
        }
      });
    } catch (err) {
      console.error('[HeadCodeInjector] Error injecting custom <head> code:', err);
    }

    return () => {
      // Cleanup on unmount or code change
      const injected = document.head.querySelectorAll('[data-tg-injected="head-code"]');
      injected.forEach(el => el.remove());
    };
  }, [code]);

  return null;
};
