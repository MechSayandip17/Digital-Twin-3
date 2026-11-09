import React, { useState, useRef, useEffect, ReactNode } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Move,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DraggableResizableWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  onOpenInNewWindow?: () => void;
  headerAction?: ReactNode;
}

export const DraggableResizableWindow: React.FC<DraggableResizableWindowProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  initialWidth = 720,
  initialHeight = 540,
  initialX,
  initialY,
  onOpenInNewWindow,
  headerAction,
}) => {
  // Window size and position state
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const defaultLeft = initialX !== undefined ? initialX : Math.max(20, Math.floor((window.innerWidth - initialWidth) / 2));
      const defaultTop = initialY !== undefined ? initialY : Math.max(70, Math.floor((window.innerHeight - initialHeight) / 3));
      return { x: defaultLeft, y: defaultTop };
    }
    return { x: 100, y: 100 };
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState<{ size: { width: number; height: number }; position: { x: number; y: number } } | null>(null);

  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0, windowX: 0, windowY: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Dragging handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    // Don't drag if clicking buttons, selects, or inputs in the header
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) {
      return;
    }

    isDragging.current = true;
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      windowX: position.x,
      windowY: position.y,
    };
    e.preventDefault();
  };

  // Resizing handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMaximized || isMinimized) return;
    isResizing.current = true;
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;
        
        // Clamp to screen
        const maxX = window.innerWidth - 120;
        const maxY = window.innerHeight - 80;
        const newX = Math.max(10, Math.min(maxX, dragStartPos.current.windowX + deltaX));
        const newY = Math.max(10, Math.min(maxY, dragStartPos.current.windowY + deltaY));

        setPosition({ x: newX, y: newY });
      } else if (isResizing.current) {
        const deltaX = e.clientX - resizeStartPos.current.x;
        const deltaY = e.clientY - resizeStartPos.current.y;

        const newWidth = Math.max(440, Math.min(window.innerWidth - 40, resizeStartPos.current.width + deltaX));
        const newHeight = Math.max(340, Math.min(window.innerHeight - 80, resizeStartPos.current.height + deltaY));

        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isResizing.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const toggleMaximize = () => {
    if (isMaximized) {
      if (preMaximizeState) {
        setSize(preMaximizeState.size);
        setPosition(preMaximizeState.position);
      }
      setIsMaximized(false);
    } else {
      setPreMaximizeState({ size, position });
      setPosition({ x: 12, y: 12 });
      setSize({
        width: window.innerWidth - 24,
        height: window.innerHeight - 24,
      });
      setIsMaximized(true);
      setIsMinimized(false);
    }
  };

  if (!isOpen) return null;

  // Minimized Floating Pill docked to bottom-right
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 bg-slate-900/95 border border-cyan-500/50 rounded-xl shadow-2xl p-2.5 flex items-center gap-3 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200"
        style={{ maxWidth: '380px' }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && <div className="text-cyan-400 shrink-0">{icon}</div>}
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{title}</div>
            <div className="text-[10px] text-cyan-300 font-mono">Floating Telemetry Active</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Restore window"
          >
            <ChevronUp className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Close window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className={`fixed z-50 flex flex-col bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden select-none transition-shadow ${
        isMaximized ? 'ring-2 ring-cyan-500/30' : 'ring-1 ring-slate-800'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      {/* Title Bar / Drag Handle */}
      <div
        onMouseDown={handleDragStart}
        className="px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between cursor-move shrink-0"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            {icon || <Move className="w-3.5 h-3.5" />}
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white truncate tracking-tight">{title}</h3>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/80 shrink-0">
                DRAGGABLE / RESIZABLE
              </span>
            </div>
            {subtitle && (
              <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Header Action controls & Window Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2" onMouseDown={(e) => e.stopPropagation()}>
          {headerAction}

          {onOpenInNewWindow && (
            <button
              onClick={onOpenInNewWindow}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700/80 transition"
              title="Open in detached browser popup"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition"
            title="Minimize to floating taskbar"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleMaximize}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition"
            title={isMaximized ? 'Restore size' : 'Maximize window'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-700/80 text-slate-400 border border-slate-700/80 transition"
            title="Close / Dock window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body (Scrollable & Interactive) */}
      <div
        className="flex-1 overflow-y-auto p-4 select-text custom-scrollbar text-slate-100"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {/* Resize Grip Handle at Bottom-Right */}
      {!isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-60 hover:opacity-100 transition group"
          title="Drag to resize window"
        >
          <svg className="w-3 h-3 text-cyan-400" viewBox="0 0 10 10">
            <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
};
