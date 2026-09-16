import React, { useEffect, useRef } from 'react';

interface AdUnitProps {
  code?: string;
  spotName: string;
  className?: string;
  isPopunder?: boolean;
  label?: string;
}

export const AdUnit: React.FC<AdUnitProps> = ({
  code,
  spotName,
  className = '',
  isPopunder = false,
  label = 'Advertisement'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code || !code.trim()) {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Clear previous contents
    container.innerHTML = '';

    try {
      // Parse HTML snippet
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(code, 'text/html');

      // Collect all child nodes
      const nodes = [
        ...Array.from(parsedDoc.head.childNodes),
        ...Array.from(parsedDoc.body.childNodes)
      ];

      nodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          if (tagName === 'script') {
            // Reconstruct script element so it executes
            const newScript = document.createElement('script');
            Array.from(el.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            if (el.innerHTML) {
              newScript.text = el.innerHTML;
            }
            container.appendChild(newScript);
          } else {
            // Clone standard elements (div, ins, iframe, etc.)
            const cloned = el.cloneNode(true) as HTMLElement;
            // Check for nested scripts inside container element
            const nestedScripts = Array.from(cloned.querySelectorAll('script'));
            nestedScripts.forEach(s => {
              const execScript = document.createElement('script');
              Array.from(s.attributes).forEach(a => execScript.setAttribute(a.name, a.value));
              if (s.innerHTML) execScript.text = s.innerHTML;
              s.parentNode?.replaceChild(execScript, s);
            });
            container.appendChild(cloned);
          }
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          container.appendChild(document.createTextNode(node.textContent));
        }
      });
    } catch (err) {
      console.error(`[AdUnit:${spotName}] Error rendering ad:`, err);
    }

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [code, spotName]);

  if (!code || !code.trim()) {
    return null;
  }

  if (isPopunder) {
    return <div ref={containerRef} id={`ad-popunder-${spotName}`} className="hidden" aria-hidden="true" />;
  }

  return (
    <div
      id={`ad-slot-${spotName}`}
      className={`my-4 p-2 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center overflow-hidden transition-all ${className}`}
    >
      {label && (
        <div className="pb-1.5 flex items-center justify-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800/60">
            {label}
          </span>
        </div>
      )}
      <div
        ref={containerRef}
        className="ad-content-wrapper flex flex-col items-center justify-center min-h-[50px] w-full overflow-x-auto text-slate-300"
      />
    </div>
  );
};
