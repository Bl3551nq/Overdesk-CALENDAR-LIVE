import React, { useEffect, useRef, useState } from 'react';

export function useDrag(initialX = 40, initialY = 40) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const positionRef = useRef({ x: initialX, y: initialY });
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Center position on mount if we want, or keep initial
  useEffect(() => {
    const x = Math.max(20, (window.innerWidth - 350) / 2);
    const y = Math.max(20, (window.innerHeight - 600) / 2);
    setPosition({ x, y });
    positionRef.current = { x, y };
    if (elementRef.current) {
      elementRef.current.style.left = `${x}px`;
      elementRef.current.style.top = `${y}px`;
    }
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, select elements, svg items, input fields, or scrolls
    if (target.closest('button, select, input, a, [role="button"], svg, path')) {
      return;
    }
    isDragging.current = true;
    hasMovedRef.current = false;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    dragStart.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y
    };
    e.preventDefault();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, select, input, a, [role="button"], svg, path')) {
      return;
    }
    isDragging.current = true;
    hasMovedRef.current = false;
    const touch = e.touches[0];
    mouseDownPos.current = { x: touch.clientX, y: touch.clientY };
    dragStart.current = {
      x: touch.clientX - positionRef.current.x,
      y: touch.clientY - positionRef.current.y
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        hasMovedRef.current = true;
      }

      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      
      // Clamp to screen boundaries to avoid losing the widget
      const boundX = Math.max(10, Math.min(window.innerWidth - 80, newX));
      const boundY = Math.max(10, Math.min(window.innerHeight - 80, newY));
      
      positionRef.current = { x: boundX, y: boundY };
      if (elementRef.current) {
        elementRef.current.style.left = `${boundX}px`;
        elementRef.current.style.top = `${boundY}px`;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      
      if (e.cancelable) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      const dx = touch.clientX - mouseDownPos.current.x;
      const dy = touch.clientY - mouseDownPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 3) {
        hasMovedRef.current = true;
      }

      const newX = touch.clientX - dragStart.current.x;
      const newY = touch.clientY - dragStart.current.y;
      
      const boundX = Math.max(10, Math.min(window.innerWidth - 80, newX));
      const boundY = Math.max(10, Math.min(window.innerHeight - 80, newY));
      
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
  }, []);

  return { position, elementRef, onMouseDown, onTouchStart, hasMovedRef };
}
export default useDrag;
