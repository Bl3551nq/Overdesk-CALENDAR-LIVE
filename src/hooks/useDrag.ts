import React, { useEffect, useRef, useState } from 'react';

export function useDrag(initialX = 40, initialY = 40) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const mouseScreenPos = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const positionRef = useRef({ x: initialX, y: initialY });
  const elementRef = useRef<HTMLDivElement | null>(null);
  
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

  // Cache dimensions exactly once on start drag to avoid layout thrashing during mouse move
  const dragWidth = useRef(350);
  const dragHeight = useRef(520);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Center position on mount for web/browser mode
  useEffect(() => {
    const rect = elementRef.current?.getBoundingClientRect();
    const widgetWidth = rect?.width || 350;
    const widgetHeight = rect?.height || 520;
    
    // Smoothly calculate center coordinates while maintaining safe minimum margins
    const x = window.innerWidth > widgetWidth ? (window.innerWidth - widgetWidth) / 2 : 0;
    const y = window.innerHeight > widgetHeight ? (window.innerHeight - widgetHeight) / 2 : 0;
    
    setPosition({ x, y });
    positionRef.current = { x, y };
    if (elementRef.current) {
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
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
    
    // Measure dynamic dimensions once right on pointer down
    const rect = elementRef.current?.getBoundingClientRect();
    dragWidth.current = rect?.width || 350;
    dragHeight.current = rect?.height || 520;

    isDragging.current = true;
    hasMovedRef.current = false;
    
    if (isElectron) {
      mouseScreenPos.current = { x: e.screenX, y: e.screenY };
    } else {
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      dragStart.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y
      };
    }
    e.preventDefault();
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      
      if (isElectron) {
        const dX = e.screenX - mouseScreenPos.current.x;
        const dY = e.screenY - mouseScreenPos.current.y;
        
        if (Math.sqrt(dX * dX + dY * dY) > 3) {
          hasMovedRef.current = true;
        }
        
        if (dX !== 0 || dY !== 0) {
          const api = (window as any).electronAPI;
          if (api && api.dragWindow) {
            api.dragWindow({ dX, dY });
          }
        }
        mouseScreenPos.current = { x: e.screenX, y: e.screenY };
        return;
      }
      
      // Standard browser movement - 100% UNCONSTRAINED PER AXIS
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        hasMovedRef.current = true;
      }

      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      
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
  }, [isElectron]);

  return { position, elementRef, onPointerDown, hasMovedRef };
}
export default useDrag;
