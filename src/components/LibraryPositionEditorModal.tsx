import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Check, Save, Move, Type, Palette, ShieldCheck, Sparkles } from 'lucide-react';
import { MemeTemplate, TextPositionConfig, ImageTextPositionsMap } from '../types';

interface LibraryPositionEditorModalProps {
  isOpen: boolean;
  libraryDisplayName: string;
  folderName: string;
  images: MemeTemplate[];
  initialPositionsMap?: ImageTextPositionsMap;
  onClose: () => void;
  onSavePositions: (positionsMap: ImageTextPositionsMap, newStatus?: number) => Promise<void>;
}

const COLOR_PALETTE = [
  '#FFFFFF', '#FDE047', '#4ADE80', '#38BDF8', '#F43F5E', '#C084FC', '#000000'
];

const FONTS = [
  { label: 'Impact (Classic)', value: 'Impact, sans-serif' },
  { label: 'Arial Black', value: 'Arial Black, sans-serif' },
  { label: 'Comic Sans', value: '"Comic Sans MS", cursive, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier Monospace', value: 'monospace' }
];

export const LibraryPositionEditorModal: React.FC<LibraryPositionEditorModalProps> = ({
  isOpen,
  libraryDisplayName,
  folderName,
  images,
  initialPositionsMap = {},
  onClose,
  onSavePositions
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [positionsMap, setPositionsMap] = useState<ImageTextPositionsMap>(initialPositionsMap);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string>('text-1');

  const activeImage = images[currentIdx] || images[0];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active positions for current image
  const currentKey = activeImage ? activeImage.name || activeImage.id : '';
  const currentPositions =
    positionsMap[currentKey] ||
    (activeImage?.name ? positionsMap[activeImage.name] : undefined) ||
    (activeImage?.id ? positionsMap[activeImage.id] : undefined) || [
      {
        id: 'text-1',
        text: 'TOP TEXT',
        x: 50,
        y: 15,
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
        text: 'BOTTOM TEXT',
        x: 50,
        y: 85,
        fontSize: 36,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 5,
        fontFamily: 'Impact, sans-serif',
        isUppercase: true,
        align: 'center'
      }
    ];

  // Initialize positionsMap ONLY when modal opens or active image/library changes
  useEffect(() => {
    if (isOpen && initialPositionsMap && Object.keys(initialPositionsMap).length > 0) {
      setPositionsMap(initialPositionsMap);
    }
  }, [isOpen, folderName]);

  // Sync active image's default positions if not set
  useEffect(() => {
    if (activeImage && currentKey && !positionsMap[currentKey]) {
      setPositionsMap((prev) => ({
        ...prev,
        [currentKey]: currentPositions
      }));
    }
  }, [currentIdx, activeImage, currentKey]);

  // Active selected text config
  const selectedText = currentPositions.find((t) => t.id === selectedTextId) || currentPositions[0];

  // Draw Canvas
  useEffect(() => {
    if (!isOpen || !activeImage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeImage.url;
    img.onload = () => {
      const width = 500;
      const height = Math.round((img.height / img.width) * 500) || 500;
      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      currentPositions.forEach((el) => {
        const textToDraw = el.isUppercase ? (el.text || 'TEXT').toUpperCase() : (el.text || 'TEXT');
        const posX = (el.x / 100) * width;
        const posY = (el.y / 100) * height;

        ctx.font = `900 ${el.fontSize}px ${el.fontFamily}`;
        ctx.textAlign = el.align;
        ctx.textBaseline = 'middle';

        // Stroke
        if (el.strokeWidth > 0) {
          ctx.strokeStyle = el.strokeColor;
          ctx.lineWidth = el.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.strokeText(textToDraw, posX, posY);
        }

        // Fill
        ctx.fillStyle = el.color;
        ctx.fillText(textToDraw, posX, posY);

        // Highlight selected
        if (el.id === selectedTextId) {
          ctx.save();
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          const metrics = ctx.measureText(textToDraw);
          const boxW = Math.max(metrics.width + 16, 60);
          const boxH = el.fontSize + 12;
          ctx.strokeRect(posX - boxW / 2, posY - boxH / 2, boxW, boxH);
          ctx.restore();
        }
      });
    };
  }, [isOpen, activeImage, currentPositions, selectedTextId]);

  if (!isOpen) return null;

  const updateCurrentPositions = (newPositions: TextPositionConfig[]) => {
    if (!activeImage || !currentKey) return;
    setPositionsMap((prev) => ({
      ...prev,
      [currentKey]: newPositions,
      ...(activeImage.name ? { [activeImage.name]: newPositions } : {}),
      ...(activeImage.id ? { [activeImage.id]: newPositions } : {})
    }));
  };

  const handleUpdateTextProp = (prop: keyof TextPositionConfig, val: any) => {
    if (!selectedText) return;
    const updated = currentPositions.map((t) =>
      t.id === selectedText.id ? { ...t, [prop]: val } : t
    );
    updateCurrentPositions(updated);
  };

  const handleAddText = () => {
    const newId = `text-${Date.now().toString(36)}`;
    const newPos: TextPositionConfig = {
      id: newId,
      text: 'NEW CAPTION',
      x: 50,
      y: 50,
      fontSize: 32,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 5,
      fontFamily: 'Impact, sans-serif',
      isUppercase: true,
      align: 'center'
    };
    updateCurrentPositions([...currentPositions, newPos]);
    setSelectedTextId(newId);
  };

  const handleRemoveText = (id: string) => {
    if (currentPositions.length <= 1) return;
    const filtered = currentPositions.filter((t) => t.id !== id);
    updateCurrentPositions(filtered);
    if (selectedTextId === id) {
      setSelectedTextId(filtered[0]?.id || '');
    }
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      await onSavePositions(positionsMap);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save library positions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base sm:text-lg font-black text-white">
                Edit Text Boxes & Positions
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Library: <span className="text-indigo-300 font-semibold">{libraryDisplayName}</span> ({folderName})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Canvas & Image Carousel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 relative">
            {/* Image Navigation Bar */}
            <div className="w-full flex items-center justify-between mb-3 text-xs font-bold text-slate-400">
              <span>Image {currentIdx + 1} of {images.length}</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentIdx === images.length - 1}
                  onClick={() => setCurrentIdx((prev) => Math.min(images.length - 1, prev + 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas Display */}
            <div className="relative border border-slate-800 rounded-lg overflow-hidden shadow-xl bg-black max-w-full">
              <canvas ref={canvasRef} className="block mx-auto max-h-[360px] object-contain" />
            </div>

            {/* Image Thumbnails Row */}
            <div className="w-full flex items-center space-x-2 overflow-x-auto pt-3 scrollbar-thin">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
                    currentIdx === idx ? 'border-indigo-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Text Position Controls & Styling (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Text Boxes List */}
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Text Boxes ({currentPositions.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddText}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Box</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                {currentPositions.map((pos, i) => (
                  <div
                    key={pos.id}
                    onClick={() => setSelectedTextId(pos.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedTextId === pos.id
                        ? 'bg-indigo-600/30 border border-indigo-500/50 text-white'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate max-w-[160px] font-mono">
                      Box {i + 1}: {pos.text || 'Untitled'}
                    </span>
                    {currentPositions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveText(pos.id);
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Position & Style Customizer */}
            {selectedText && (
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-3 text-xs">
                {/* Caption Text Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Default Placeholder
                  </label>
                  <input
                    type="text"
                    value={selectedText.text || ''}
                    onChange={(e) => handleUpdateTextProp('text', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                {/* X and Y Percent Sliders */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>X Position</span>
                      <span className="text-indigo-400">{Math.round(selectedText.x)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedText.x}
                      onChange={(e) => handleUpdateTextProp('x', Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Y Position</span>
                      <span className="text-indigo-400">{Math.round(selectedText.y)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedText.y}
                      onChange={(e) => handleUpdateTextProp('y', Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Font Size & Alignment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Font Size
                    </label>
                    <input
                      type="number"
                      min="12"
                      max="80"
                      value={selectedText.fontSize}
                      onChange={(e) => handleUpdateTextProp('fontSize', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1 px-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Font Family
                    </label>
                    <select
                      value={selectedText.fontFamily}
                      onChange={(e) => handleUpdateTextProp('fontFamily', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-white outline-none"
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color Palette Picker */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-2">
                    {COLOR_PALETTE.map((clr) => (
                      <button
                        key={clr}
                        type="button"
                        onClick={() => handleUpdateTextProp('color', clr)}
                        style={{ backgroundColor: clr }}
                        className={`w-6 h-6 rounded-full border border-slate-700 transition-transform ${
                          selectedText.color === clr ? 'scale-125 border-indigo-400 ring-2 ring-indigo-400/50' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Generates text_positions.json for library images</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving JSON...' : 'Save Positions & JSON'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
