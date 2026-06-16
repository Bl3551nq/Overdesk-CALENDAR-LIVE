import React, { useEffect, useRef, useState } from 'react';

/**
 * Clean & bulletproof dragging hook that supports:
 * 1. Native Electron borderless high-fps dragging (via -webkit-app-region)
 * 2. High-fidelity Web-safe unconstrained dragging (respects scale factors / zoom perfectly)
 */
export function useDrag(initialX = 40, initialY = 40, scale = 1, onWidgetClick?: () => void) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const positionRef = useRef({ x: initialX, y: initialY });
  const elementRef = useRef<HTMLDivElement | null>(null);
  
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

  const clickCallbackRef = useRef(onWidgetClick);
  useEffect(() => {
    clickCallbackRef.current = onWidgetClick;
  }, [onWidgetClick]);

  // Sync internal position reference
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Center position on mount for web/browser mode
  useEffect(() => {
    if (isElectron) return; // Electron defaults to main-process configured window center

    const rect = elementRef.current?.getBoundingClientRect();
    const widgetWidth = rect?.width || 350;
    const widgetHeight = rect?.height || 520;
    
    // Smoothly calculate center coordinates while maintaining safe minimum margins
    const x = window.innerWidth > widgetWidth ? (window.innerWidth - widgetWidth) / 2 : 40;
    const y = window.innerHeight > widgetHeight ? (window.innerHeight - widgetHeight) / 2 : 40;
    
    setPosition({ x, y });
    positionRef.current = { x, y };
    if (elementRef.current) {
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
    }
  }, [isElectron]);

  const onPointerDown = (e: React.PointerEvent) => {
    // In Electron, we let native OS window dragging handle it.
    // CSS "-webkit-app-region: drag" does 100% of the drag lifting smoothly.
    if (isElectron) {
      return;
    }

    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, select elements, svg items, input fields, or inside card containers
    if (target.closest('button, select, input, a, [role="button"], svg, path, .card-container, .news-list')) {
      return;
    }
    
    if (elementRef.current) {
      try {
        elementRef.current.setPointerCapture(e.pointerId);
      } catch (err) {
        console.error("Pointer capture error", err);
      }
    }
    
    isDragging.current = true;
    hasMovedRef.current = false;
    
    // Store starting positions
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    dragStart.current = {
      x: positionRef.current.x,
      y: positionRef.current.y
    };
    
    e.preventDefault();
  };

  useEffect(() => {
    if (isElectron) {
      // Electron native dragging needs no JS move handlers to compute coordinates.
      return;
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      
      // Filter out small accidental clicks
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        hasMovedRef.current = true;
      }

      // Crucial: divide current mouse offset by widget's scale (zoom factor)
      // to keep widget bound 100% under the mouse cursor at all scale levels!
      const currentScale = scale || 1;
      const newX = dragStart.current.x + dx / currentScale;
      const newY = dragStart.current.y + dy / currentScale;
      
      positionRef.current = { x: newX, y: newY };
      if (elementRef.current) {
        elementRef.current.style.left = `${newX}px`;
        elementRef.current.style.top = `${newY}px`;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        if (elementRef.current) {
          try {
            elementRef.current.releasePointerCapture(e.pointerId);
          } catch (err) {}
        }
        setPosition(positionRef.current);
        if (!hasMovedRef.current && clickCallbackRef.current) {
          clickCallbackRef.current();
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isElectron, scale]);

  return { position, elementRef, onPointerDown, hasMovedRef };
}
export default useDrag;
