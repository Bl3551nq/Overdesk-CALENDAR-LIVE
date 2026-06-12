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

  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, select elements, svg items, input fields, or inside card containers/settings panels
    if (target.closest('button, select, input, a, [role="button"], svg, path, .card-container, .news-list, .settings-overlay, .filter-panel')) {
      return;
    }
    
    // Measure dynamic dimensions once right on click down
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

  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, select, input, a, [role="button"], svg, path, .card-container, .news-list, .settings-overlay, .filter-panel')) {
      return;
    }

    // Measure dynamic dimensions once right on touch down
    const rect = elementRef.current?.getBoundingClientRect();
    dragWidth.current = rect?.width || 350;
    dragHeight.current = rect?.height || 520;

    isDragging.current = true;
    hasMovedRef.current = false;
    
    const touch = e.touches[0];
    if (isElectron) {
      mouseScreenPos.current = { x: touch.screenX, y: touch.screenY };
    } else {
      mouseDownPos.current = { x: touch.clientX, y: touch.clientY };
      dragStart.current = {
        x: touch.clientX - positionRef.current.x,
        y: touch.clientY - positionRef.current.y
      };
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
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
      
      // Standard browser movement
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        hasMovedRef.current = true;
      }

      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      
      const w = dragWidth.current;
      const h = dragHeight.current;
      
      // Calculate boundaries based on actual cached dimensions
      const boundX = window.innerWidth > w + 24 
        ? Math.max(12, Math.min(window.innerWidth - w - 12, newX))
        : Math.max(0, (window.innerWidth - w) / 2);

      const boundY = window.innerHeight > h + 24
        ? Math.max(12, Math.min(window.innerHeight - h - 12, newY))
        : Math.max(0, (window.innerHeight - h) / 2);
      
      positionRef.current = { x: boundX, y: boundY };
      if (elementRef.current) {
        elementRef.current.style.left = `${boundX}px`;
        elementRef.current.style.top = `${boundY}px`;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      
      const touch = e.touches[0];
      if (isElectron) {
        const dX = touch.screenX - mouseScreenPos.current.x;
        const dY = touch.screenY - mouseScreenPos.current.y;
        
        if (Math.sqrt(dX * dX + dY * dY) > 3) {
          hasMovedRef.current = true;
        }
        
        if (dX !== 0 || dY !== 0) {
          const api = (window as any).electronAPI;
          if (api && api.dragWindow) {
            api.dragWindow({ dX, dY });
          }
        }
        mouseScreenPos.current = { x: touch.screenX, y: touch.screenY };
        return;
      }
      
      if (e.cancelable) {
        e.preventDefault();
      }

      const dx = touch.clientX - mouseDownPos.current.x;
      const dy = touch.clientY - mouseDownPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        hasMovedRef.current = true;
      }

      const newX = touch.clientX - dragStart.current.x;
      const newY = touch.clientY - dragStart.current.y;
      
      const w = dragWidth.current;
      const h = dragHeight.current;
      
      const boundX = window.innerWidth > w + 24 
        ? Math.max(12, Math.min(window.innerWidth - w - 12, newX))
        : Math.max(0, (window.innerWidth - w) / 2);

      const boundY = window.innerHeight > h + 24
        ? Math.max(12, Math.min(window.innerHeight - h - 12, newY))
        : Math.max(0, (window.innerHeight - h) / 2);
      
      positionRef.current = { x: boundX, y: boundY };
      if (elementRef.current) {
        elementRef.current.style.left = `${boundX}px`;
        elementRef.current.style.top = `${boundY}px`;
      }
    };

    const onDragEnd = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setPosition(positionRef.current);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onDragEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onDragEnd);
    };
  }, [isElectron]);

  return { position, elementRef, onMouseDown, onTouchStart, hasMovedRef };
}
export default useDrag;
