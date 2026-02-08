import { useEffect, useState } from 'react';

interface SkipLink {
  id: string;
  label: string;
  targetId: string;
}

const skipLinks: SkipLink[] = [
  { id: 'skip-nav', label: 'דלג לניווט', targetId: 'main-navigation' },
];

export default function SkipLinks() {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && focusedIndex === null) {
        // First tab - focus first skip link
        setFocusedIndex(0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex]);

  const handleSkipClick = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFocusedIndex(null);
    }
  };

  return (
    <div className="skip-links-container" role="navigation" aria-label="קישורי דילוג">
      {skipLinks.map((link, index) => (
        <a
          key={link.id}
          href={`#${link.targetId}`}
          onClick={(e) => {
            e.preventDefault();
            handleSkipClick(link.targetId);
          }}
          className={`
            skip-link
            ${focusedIndex === index ? 'skip-link-focused' : ''}
          `}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => {
            // Only clear focus if moving to another skip link
            setTimeout(() => {
              const activeElement = document.activeElement;
              if (!activeElement?.classList.contains('skip-link')) {
                setFocusedIndex(null);
              }
            }, 0);
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
