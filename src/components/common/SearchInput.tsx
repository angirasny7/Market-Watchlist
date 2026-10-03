import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mobilePlaceholder?: string;
  ariaLabel?: string;
  enableShortcut?: boolean;
  className?: string;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Search stock or keyword',
      mobilePlaceholder = 'Search…',
      ariaLabel = 'Search',
      enableShortcut = true,
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const [isFocused, setIsFocused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Responsive placeholder detection
    useEffect(() => {
      if (typeof window === 'undefined') return;
      const mql = window.matchMedia('(max-width: 640px)');
      setIsMobile(mql.matches);

      const handler = (e: MediaQueryListEvent) => {
        setIsMobile(e.matches);
      };

      if (mql.addEventListener) {
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
      } else if ((mql as any).addListener) {
        (mql as any).addListener(handler);
        return () => (mql as any).removeListener(handler);
      }
    }, []);

    // Global '/' keydown shortcut listener
    useEffect(() => {
      if (!enableShortcut) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === '/') {
          const active = document.activeElement;
          const isInputActive =
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement ||
            active instanceof HTMLSelectElement ||
            active?.getAttribute('contenteditable') === 'true';

          if (!isInputActive) {
            e.preventDefault();
            internalRef.current?.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enableShortcut]);

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      internalRef.current?.focus();
    };

    const hasValue = Boolean(value && value.length > 0);
    const showShortcut = enableShortcut && !isFocused && !hasValue;

    return (
      <div className={cn('relative flex-1 min-w-[220px] w-full', containerClassName)}>
        {/* Magnifier Icon */}
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none select-none z-10"
        />

        {/* Input Field */}
        <input
          ref={internalRef}
          type="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholder={isMobile ? mobilePlaceholder : placeholder}
          className={cn(
            'w-full h-10 pl-10 pr-12 bg-surface text-slate-100 text-sm rounded-lg border border-border',
            'placeholder:text-slate-400 placeholder:truncate',
            'focus:outline-none focus-visible:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/30',
            '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
            'transition-all duration-150',
            className
          )}
          {...props}
        />

        {/* Right side: Clear (×) Button or Keycap Hint */}
        {hasValue ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-surface-hover/80 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        ) : showShortcut ? (
          <kbd
            aria-hidden="true"
            className="hidden md:inline-flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-400 bg-surface-subtle border border-border/80 rounded pointer-events-none select-none shadow-sm [@media(hover:none)]:hidden"
          >
            /
          </kbd>
        ) : null}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
