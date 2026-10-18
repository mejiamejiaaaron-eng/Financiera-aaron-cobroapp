import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, GripVertical, Search } from 'lucide-react';

interface Props {
  onOpenPaymentSearch: () => void;
}

export const FloatingPaymentButton: React.FC<Props> = ({ onOpenPaymentSearch }) => {
  // Load saved position or default to bottom-right
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('financiera_fab_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    // Default safe placement bottom right above bottom nav
    const initialX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 130) : 200;
    const initialY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 150) : 500;
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef({
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    hasMoved: false,
  });

  // Ensure position stays within viewport on resize
  useEffect(() => {
    const handleResize = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const maxX = Math.max(10, window.innerWidth - rect.width - 12);
      const maxY = Math.max(10, window.innerHeight - rect.height - 12);

      setPosition(prev => {
        const clampedX = Math.min(Math.max(12, prev.x), maxX);
        const clampedY = Math.min(Math.max(12, prev.y), maxY);
        return { x: clampedX, y: clampedY };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save position when stopped dragging
  const savePosition = (newPos: { x: number; y: number }) => {
    try {
      localStorage.setItem('financiera_fab_position', JSON.stringify(newPos));
    } catch {
      // Ignore storage errors
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
      hasMoved: false,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragInfoRef.current.startX;
      const deltaY = moveEvent.clientY - dragInfoRef.current.startY;

      if (Math.hypot(deltaX, deltaY) > 5) {
        dragInfoRef.current.hasMoved = true;
      }

      const rect = buttonRef.current?.getBoundingClientRect() || { width: 110, height: 48 };
      const maxX = window.innerWidth - rect.width - 12;
      const maxY = window.innerHeight - rect.height - 12;

      const nextX = Math.min(Math.max(12, dragInfoRef.current.startPosX + deltaX), maxX);
      const nextY = Math.min(Math.max(12, dragInfoRef.current.startPosY + deltaY), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (!dragInfoRef.current.hasMoved) {
        onOpenPaymentSearch();
      } else {
        savePosition(position);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Touch drag handlers (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragInfoRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: position.x,
      startPosY: position.y,
      hasMoved: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragInfoRef.current.startX;
    const deltaY = touch.clientY - dragInfoRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 6) {
      dragInfoRef.current.hasMoved = true;
    }

    const rect = buttonRef.current?.getBoundingClientRect() || { width: 110, height: 48 };
    const maxX = window.innerWidth - rect.width - 12;
    const maxY = window.innerHeight - rect.height - 12;

    const nextX = Math.min(Math.max(12, dragInfoRef.current.startPosX + deltaX), maxX);
    const nextY = Math.min(Math.max(12, dragInfoRef.current.startPosY + deltaY), maxY);

    setPosition({ x: nextX, y: nextY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (!dragInfoRef.current.hasMoved) {
      onOpenPaymentSearch();
    } else {
      savePosition(position);
    }
  };

  return (
    <div
      ref={buttonRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`fixed z-45 select-none touch-none no-print transition-shadow ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl opacity-95 ring-4 ring-emerald-400/60'
          : 'cursor-grab hover:scale-105 hover:shadow-emerald-500/30 shadow-2xl'
      }`}
      title="Arrastra a cualquier parte de la pantalla • Presiona para buscar cliente y cobrar"
    >
      <div className="flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm rounded-full border-2 border-emerald-300/40 shadow-2xl backdrop-blur-xs group">
        {/* Grip indicator */}
        <GripVertical className="w-3.5 h-3.5 text-emerald-200/70 group-hover:text-white transition-colors" />

        {/* Action Icon */}
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black shadow-inner">
          <DollarSign className="w-4 h-4 text-white" />
        </div>

        {/* Text Label */}
        <span className="tracking-wide text-xs sm:text-sm font-extrabold pr-1">Pagar</span>

        {/* Pulse indicator */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
        </span>
      </div>
    </div>
  );
};
