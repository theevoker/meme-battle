import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Plus, Trash2, Type, Move, Palette, Check } from 'lucide-react';
import { MemeTemplate, TextElement } from '../types';

export interface MemeCanvasRef {
  exportImageDataUrl: () => string;
}

interface MemeCanvasProps {
  template: MemeTemplate;
  onSubmitMeme?: (imageDataUrl: string) => void;
  isSubmitting?: boolean;
}

const PALETTE_COLORS = [
  '#FFFFFF', '#FDE047', '#4ADE80', '#38BDF8', '#F43F5E', '#C084FC', '#000000'
];

const FONT_FAMILIES = [
  { label: 'Impact (Classic)', value: 'Impact, sans-serif' },
  { label: 'Arial Black', value: 'Arial Black, sans-serif' },
  { label: 'Comic Sans', value: '"Comic Sans MS", cursive, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier Monospace', value: 'monospace' }
];

export const MemeCanvas = forwardRef<MemeCanvasRef, MemeCanvasProps>(({
  template,
  onSubmitMeme,
  isSubmitting = false
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initial text elements
  const [textElements, setTextElements] = useState<TextElement[]>([
    {
      id: 'text-1',
      text: 'TOP TEXT HERE',
      x: 50, // center 50%
      y: 12, // top 12%
      fontSize: 36,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 5,
      fontFamily: 'Impact, sans-serif',
      isUppercase: true,
      align: 'center'
    },
    {
      id: 'text-2',
      text: 'BOTTOM TEXT HERE',
      x: 50,
      y: 88, // bottom 88%
      fontSize: 36,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 5,
      fontFamily: 'Impact, sans-serif',
      isUppercase: true,
      align: 'center'
    }
  ]);

  // Load preset text positions when template changes
  useEffect(() => {
    if (template.textPositions && template.textPositions.length > 0) {
      const elements: TextElement[] = template.textPositions.map((pos, idx) => ({
        id: pos.id || `text-${idx + 1}`,
        text: pos.text || (idx === 0 ? 'TOP TEXT HERE' : 'BOTTOM TEXT HERE'),
        x: pos.x,
        y: pos.y,
        fontSize: pos.fontSize || 36,
        color: pos.color || '#FFFFFF',
        strokeColor: pos.strokeColor || '#000000',
        strokeWidth: pos.strokeWidth ?? 5,
        fontFamily: pos.fontFamily || 'Impact, sans-serif',
        isUppercase: pos.isUppercase !== undefined ? pos.isUppercase : true,
        align: pos.align || 'center'
      }));
      setTextElements(elements);
      if (elements[0]) {
        setSelectedId(elements[0].id);
      }
    } else {
      // Default top/bottom text
      const defaults: TextElement[] = [
        {
          id: 'text-1',
          text: 'TOP TEXT HERE',
          x: 50,
          y: 12,
          fontSize: 36,
          color: '#FFFFFF',
          strokeColor: '#000000',
          strokeWidth: 5,
          fontFamily: 'Impact, sans-serif',
          isUppercase: true,
          align: 'center'
        },
        {
          id: 'text-2',
          text: 'BOTTOM TEXT HERE',
          x: 50,
          y: 88,
          fontSize: 36,
          color: '#FFFFFF',
          strokeColor: '#000000',
          strokeWidth: 5,
          fontFamily: 'Impact, sans-serif',
          isUppercase: true,
          align: 'center'
        }
      ];
      setTextElements(defaults);
      setSelectedId('text-1');
    }
  }, [template.id, template.url, template.textPositions]);

  const [selectedId, setSelectedId] = useState<string>('text-1');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected text element getter
  const selectedText = textElements.find((t) => t.id === selectedId) || textElements[0];

  const loadedImgRef = useRef<HTMLImageElement | null>(null);

  // Render Canvas
  const drawCanvas = (forExport = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (img: HTMLImageElement) => {
      const width = 600;
      const height = Math.round((img.height / img.width) * 600) || 600;
      canvas.width = width;
      canvas.height = height;

      // Clear & Draw Background Template
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Draw each text element
      textElements.forEach((el) => {
        const textToDraw = el.isUppercase ? el.text.toUpperCase() : el.text;
        if (!textToDraw) return;

        const posX = (el.x / 100) * width;
        const posY = (el.y / 100) * height;

        ctx.font = `900 ${el.fontSize}px ${el.fontFamily}`;
        ctx.textAlign = el.align;
        ctx.textBaseline = 'middle';

        // Multi-line support
        const lines = textToDraw.split('\n');
        const lineHeight = el.fontSize * 1.1;
        const totalHeight = lines.length * lineHeight;
        const startY = posY - (totalHeight / 2) + (lineHeight / 2);

        lines.forEach((line, index) => {
          const currentY = startY + (index * lineHeight);

          // Stroke / Outline
          if (el.strokeWidth > 0) {
            ctx.strokeStyle = el.strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(line, posX, currentY);
          }

          // Fill
          ctx.fillStyle = el.color;
          ctx.fillText(line, posX, currentY);
        });

        // Text outline rendering disabled per design requirement
        /* No bounding box outline */
      });
    };

    if (loadedImgRef.current && loadedImgRef.current.src === template.url) {
      render(loadedImgRef.current);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = template.url;
      img.onload = () => {
        loadedImgRef.current = img;
        render(img);
      };
    }
  };

  useEffect(() => {
    drawCanvas(false);
  }, [template, textElements, selectedId]);

  // Imperative handle for parent export
  useImperativeHandle(ref, () => ({
    exportImageDataUrl: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      // Render without dashed selection outline
      drawCanvas(true);
      const dataUrl = canvas.toDataURL('image/png');
      // Restore canvas with selection outline
      drawCanvas(false);
      return dataUrl;
    }
  }));

  // Handle Start Drag (Mouse & Touch)
  const handleDragStart = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((clientX - rect.left) / rect.width) * 100;
    const clickY = ((clientY - rect.top) / rect.height) * 100;

    let closestId: string | null = null;
    let minDistance = Infinity;

    textElements.forEach((el) => {
      const dist = Math.hypot(el.x - clickX, el.y - clickY);
      if (dist < 25 && dist < minDistance) {
        minDistance = dist;
        closestId = el.id;
      }
    });

    if (closestId) {
      setSelectedId(closestId);
      setDraggingId(closestId);
      const el = textElements.find((t) => t.id === closestId);
      if (el) {
        setDragOffset({ x: clickX - el.x, y: clickY - el.y });
      }
    }
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!draggingId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const newX = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100 - dragOffset.x));
    const newY = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100 - dragOffset.y));

    setTextElements((prev) =>
      prev.map((el) => (el.id === draggingId ? { ...el, x: newX, y: newY } : el))
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  // Touch Handlers for Mobile Devices
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setDraggingId(null);
  };

  // Add new text element
  const addTextElement = () => {
    const newEl: TextElement = {
      id: `text_${Date.now()}`,
      text: 'NEW CAPTION',
      x: 50,
      y: 50,
      fontSize: 32,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 4,
      fontFamily: 'Impact, sans-serif',
      isUppercase: true,
      align: 'center'
    };
    setTextElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  // Remove selected text element
  const deleteSelectedText = () => {
    if (textElements.length <= 1) return; // Keep at least 1 element
    setTextElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(textElements[0].id);
  };

  // Update selected element property
  const updateSelected = (updates: Partial<TextElement>) => {
    if (!selectedId) return;
    setTextElements((prev) =>
      prev.map((el) => (el.id === selectedId ? { ...el, ...updates } : el))
    );
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Interactive Canvas Stage (7 cols) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col items-center shadow-2xl relative">
          <div className="text-[11px] sm:text-xs font-medium text-slate-400 mb-2 flex items-center space-x-1">
            <Move className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tap & Drag captions to position on meme canvas</span>
          </div>

          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full max-w-[500px] rounded-xl shadow-lg border border-slate-800 cursor-move bg-slate-900 touch-none"
          />

          {/* Submit Action Button */}
          {onSubmitMeme && (
            <button
              type="button"
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  drawCanvas(true);
                  const dataUrl = canvas.toDataURL('image/png');
                  drawCanvas(false);
                  onSubmitMeme(dataUrl);
                }
              }}
              disabled={isSubmitting}
              className="w-full max-w-[500px] mt-4 min-h-[48px] py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 touch-manipulation active:scale-[0.98]"
            >
              <Check className="w-5 h-5" />
              <span>{isSubmitting ? 'SUBMITTING MEME...' : 'LOCK IN & SUBMIT MEME'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Text Formatting Panel (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Formatting Controls Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Type className="w-4 h-4 text-indigo-400" />
              <span>CAPTION EDITOR</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={addTextElement}
                className="min-h-[44px] px-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer touch-manipulation active:scale-95"
                title="Add New Text Box"
              >
                <Plus className="w-4 h-4" />
                <span>Text</span>
              </button>

              {textElements.length > 1 && (
                <button
                  type="button"
                  onClick={deleteSelectedText}
                  className="min-h-[44px] min-w-[44px] p-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95"
                  title="Delete Selected Text"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Text Input */}
          {selectedText && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Selected Caption Text
                </label>
                <textarea
                  rows={2}
                  value={selectedText.text}
                  onChange={(e) => updateSelected({ text: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-xl p-3 text-white font-mono text-sm outline-none transition-all resize-none min-h-[44px]"
                  placeholder="Type caption..."
                />
              </div>

              {/* Font Size & Uppercase */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span>FONT SIZE</span>
                    <span className="text-indigo-400">{selectedText.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="80"
                    value={selectedText.fontSize}
                    onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer h-8"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span>OUTLINE</span>
                    <span className="text-cyan-400">{selectedText.strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    value={selectedText.strokeWidth}
                    onChange={(e) => updateSelected({ strokeWidth: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer h-8"
                  />
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5 flex items-center space-x-1">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  <span>Text Color</span>
                </label>
                <div className="flex items-center space-x-2.5 overflow-x-auto pb-1">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSelected({ color: c })}
                      className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-full border-2 transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                        selectedText.color === c ? 'border-indigo-400 scale-110 shadow-md ring-2 ring-indigo-500/50' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={selectedText.color}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                    className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-full cursor-pointer bg-transparent border-0 touch-manipulation"
                  />
                </div>
              </div>

              {/* Font Family Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Font Style
                </label>
                <select
                  value={selectedText.fontFamily}
                  onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700/80 text-slate-200 rounded-xl p-2.5 text-sm font-semibold outline-none cursor-pointer"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

