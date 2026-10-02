import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface PopoverMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface PopoverMenuProps {
  trigger: (props: {
    ref: React.RefObject<HTMLButtonElement>;
    onClick: (e: React.MouseEvent) => void;
    'aria-haspopup': 'true';
    'aria-expanded': boolean;
  }) => React.ReactNode;
  items?: PopoverMenuItem[];
  children?: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  ariaLabel?: string;
}

export const PopoverMenu: React.FC<PopoverMenuProps> = ({
  trigger,
  items,
  children,
  align = 'right',
  className = '',
  ariaLabel = 'Options menu',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuEl = menuRef.current;

    const menuWidth = menuEl ? menuEl.offsetWidth : 160;
    const menuHeight = menuEl ? menuEl.offsetHeight : 90;

    // Vertical positioning: check space below vs space above
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    let top: number;

    if (spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow) {
      // Flip above
      top = triggerRect.top - menuHeight - 4;
    } else {
      // Place below
      top = triggerRect.bottom + 4;
    }

    // Horizontal positioning: align right or left
    let left: number;
    if (align === 'right') {
      left = triggerRect.right - menuWidth;
    } else {
      left = triggerRect.left;
    }

    // Clamp inside viewport with 8px margin
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));

    setCoords({ top, left });
  }, [align]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    // Return focus to the trigger element
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, []);

  // Update position after mounting the portal or trigger layout
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Window events: scroll, resize, escape, outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    const handleScrollOrResize = (e: Event) => {
      // If scroll happened inside the menu itself, do not close
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      closeMenu();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }

      if (!menuRef.current) return;
      const focusableItems = Array.from(
        menuRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
      );
      if (focusableItems.length === 0) return;

      const activeIndex = focusableItems.indexOf(document.activeElement as HTMLButtonElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = activeIndex < focusableItems.length - 1 ? activeIndex + 1 : 0;
        focusableItems[nextIndex]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = activeIndex > 0 ? activeIndex - 1 : focusableItems.length - 1;
        focusableItems[prevIndex]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusableItems[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        focusableItems[focusableItems.length - 1]?.focus();
      } else if (e.key === 'Tab') {
        // Tab out closes the menu
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('touchstart', handleOutsideClick, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  // Initial focus on first menuitem when opened
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLButtonElement>('button:not([disabled])');
      if (firstItem) {
        firstItem.focus();
      }
    }
  }, [isOpen]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      closeMenu();
    }
  };

  const portalContent = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }}
          className={`z-50 w-44 rounded-xl bg-surface border border-border shadow-2xl p-1 backdrop-blur-md animate-fade-in ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {items &&
            items.map((item, index) => {
              const isDanger = item.variant === 'danger';
              return (
                <button
                  key={index}
                  role="menuitem"
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    closeMenu();
                    item.onClick();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left disabled:opacity-40 disabled:pointer-events-none ${
                    isDanger
                      ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-300 outline-none'
                      : 'text-slate-300 hover:text-white hover:bg-surface-hover focus:bg-surface-hover focus:text-white outline-none'
                  }`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              );
            })}
          {children && children(closeMenu)}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: handleTriggerClick,
        'aria-haspopup': 'true',
        'aria-expanded': isOpen,
      })}
      {portalContent}
    </>
  );
};
