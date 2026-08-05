import React, { useState, useEffect } from 'react';
import { Layers, Plus, Upload, Check, Folder, Sparkles, Edit3, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';
import { PhotoLibrary, MemeTemplate, ImageTextPositionsMap } from '../types';
import { LibraryPositionEditorModal } from './LibraryPositionEditorModal';
import { compressImageDataUrl } from '../utils/imageCompressor';

interface LibrarySelectionViewProps {
  selectedLibraryIds: string[];
  onToggleLibrary: (libraryId: string) => void;
  onLibrariesUpdated: (libraries: PhotoLibrary[]) => void;
  serverUrl?: string;
}

export const LibrarySelectionView: React.FC<LibrarySelectionViewProps> = ({
  selectedLibraryIds,
  onToggleLibrary,
  onLibrariesUpdated,
  serverUrl = ''
}) => {
  const [libraries, setLibraries] = useState<PhotoLibrary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Library Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newLibName, setNewLibName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Position Editor Modal State
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [activeEditingLibrary, setActiveEditingLibrary] = useState<{
    displayName: string;
    folderName: string;
    images: MemeTemplate[];
    positionsMap: ImageTextPositionsMap;
    libraryId: string;
  } | null>(null);

  // Fetch libraries from backend / GitHub
  const fetchLibraries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${serverUrl}/api/libraries`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.libraries)) {
          setLibraries(data.libraries);
          onLibrariesUpdated(data.libraries);
        }
      }
    } catch (err) {
      console.warn('Failed to load libraries from server, fallback to default:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

  // Handle uploading files for a new library
  const handlePhotosSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsProcessingUpload(true);
      const fileList = Array.from(files) as File[];
      const processed: { name: string; url: string }[] = [];

      for (const file of fileList) {
        if (file.name.endsWith('.zip')) {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          for (const filename of Object.keys(zipContent.files)) {
            const entry = zipContent.files[filename];
            if (entry.dir) continue;
            const lower = filename.toLowerCase();
            if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
              const blob = await entry.async('blob');
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target?.result as string);
                reader.readAsDataURL(blob);
              });
              const compressed = await compressImageDataUrl(base64);
              const cleanName = filename.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Photo';
              processed.push({ name: cleanName, url: compressed });
            }
          }
        } else if (file.type.startsWith('image/')) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });
          const compressed = await compressImageDataUrl(base64);
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          processed.push({ name: cleanName, url: compressed });
        }
      }

      setUploadedFiles((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error('Failed processing photos:', err);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Submit new library creation
  const handleCreateLibrarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibName.trim() || uploadedFiles.length === 0) return;

    const displayName = newLibName.trim();
    const shortId = Math.random().toString(36).substring(2, 8);
    // Folder name format specified by prompt: "name_user_chose:ID"
    const folderName = `${displayName.replace(/[^a-zA-Z0-9_ -]/g, '')}:${shortId}`;

    const templates: MemeTemplate[] = uploadedFiles.map((f, idx) => ({
      id: `tmpl_${shortId}_${idx}`,
      name: f.name,
      url: f.url,
      isCustom: true
    }));

    // Default top/bottom text positions for all images in library
    const defaultPositionsMap: ImageTextPositionsMap = {};
    uploadedFiles.forEach((f) => {
      defaultPositionsMap[f.name] = [
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
    });

    try {
      setIsProcessingUpload(true);
      // Post to backend to save folder, status.txt = 0, and default positions.json
      const res = await fetch(`${serverUrl}/api/libraries/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          folderName,
          images: templates,
          textPositionsMap: defaultPositionsMap,
          status: 0 // Starts at 0 as requested
        })
      });

      if (res.ok) {
        const data = await res.json();
        const createdLib: PhotoLibrary = data.library || {
          id: folderName,
          folderName,
          displayName,
          status: 0,
          images: templates,
          textPositionsMap: defaultPositionsMap
        };

        // Close upload form modal
        setShowUploadModal(false);
        setNewLibName('');
        setUploadedFiles([]);

        // POP UP POSITION EDITOR GUI IMMEDIATELY AFTER UPLOAD!
        setActiveEditingLibrary({
          displayName: createdLib.displayName,
          folderName: createdLib.folderName,
          images: createdLib.images,
          positionsMap: createdLib.textPositionsMap || defaultPositionsMap,
          libraryId: createdLib.id
        });
        setEditorModalOpen(true);

        await fetchLibraries();
      }
    } catch (err) {
      console.error('Failed creating photo library:', err);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Save updated positions from the Position Editor GUI
  const handleSavePositions = async (positionsMap: ImageTextPositionsMap) => {
    if (!activeEditingLibrary) return;

    try {
      await fetch(`${serverUrl}/api/libraries/${encodeURIComponent(activeEditingLibrary.folderName)}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textPositionsMap: positionsMap })
      });
      await fetchLibraries();
    } catch (err) {
      console.error('Failed saving positions:', err);
    }
  };

  // Toggle status between 0 and 5 for admin/creator testing
  const handleToggleStatus = async (library: PhotoLibrary) => {
    const nextStatus = library.status === 5 ? 0 : 5;
    try {
      await fetch(`${serverUrl}/api/libraries/${encodeURIComponent(library.folderName)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      await fetchLibraries();
    } catch (err) {
      console.error('Failed updating library status:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-extrabold text-white">Photo Libraries</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="min-h-[36px] py-1.5 px-3 rounded-xl bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 text-indigo-300 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Library</span>
        </button>
      </div>

      {/* Libraries List Grid */}
      {isLoading ? (
        <div className="p-6 text-center text-xs text-slate-400 animate-pulse">
          Loading photo libraries from GitHub repository...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {libraries.map((lib) => {
            const isSelected = selectedLibraryIds.includes(lib.id) || selectedLibraryIds.includes(lib.folderName);
            const coverImg = lib.images?.[0]?.url || '';

            return (
              <div
                key={lib.id}
                onClick={() => onToggleLibrary(lib.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between relative overflow-hidden ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/70 shadow-lg shadow-indigo-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  {coverImg ? (
                    <img
                      src={coverImg}
                      alt={lib.displayName}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                      <Folder className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>{lib.displayName}</span>
                      {lib.isBuiltIn && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                          Built-in
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {lib.images?.length || 0} templates
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!lib.isBuiltIn && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveEditingLibrary({
                          displayName: lib.displayName,
                          folderName: lib.folderName,
                          images: lib.images,
                          positionsMap: lib.textPositionsMap || {},
                          libraryId: lib.id
                        });
                        setEditorModalOpen(true);
                      }}
                      title="Edit text box positions"
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-indigo-500 border-indigo-400 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Upload New Photo Library */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Upload New Photo Library</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Library Name
                </label>
                <input
                  type="text"
                  required
                  value={newLibName}
                  onChange={(e) => setNewLibName(e.target.value)}
                  placeholder="e.g. Cats & Memes"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Select Photos or ZIP Pack
                </label>
                <label className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer bg-indigo-950/20 flex flex-col items-center justify-center space-y-1.5 transition-all">
                  <Upload className="w-6 h-6 text-indigo-400" />
                  <span className="font-bold text-indigo-300">
                    {isProcessingUpload ? 'Compressing photos...' : 'Choose PNG/JPG files or ZIP pack'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.zip"
                    onChange={handlePhotosSelected}
                    className="hidden"
                    disabled={isProcessingUpload}
                  />
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-300">
                    {uploadedFiles.length} photos ready
                  </span>
                  <div className="flex items-center space-x-1">
                    {uploadedFiles.slice(0, 5).map((f, i) => (
                      <img key={i} src={f.url} alt="" className="w-8 h-8 rounded object-cover border border-slate-700" />
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px]">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Will be uploaded to GitHub repository in folder name: <code className="bg-amber-950/60 px-1 py-0.5 rounded font-mono">{newLibName || 'Library'}:ID</code></span>
                </p>
                <p className="mt-1 text-slate-400">
                  Initial status.txt file will say <code className="text-white font-mono">0</code>. A text position editor GUI will open immediately so you can configure text boxes!
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateLibrarySubmit}
                  disabled={!newLibName.trim() || uploadedFiles.length === 0 || isProcessingUpload}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                >
                  Create & Launch Editor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GUI Modal: Position & Formatting Editor */}
      {editorModalOpen && activeEditingLibrary && (
        <LibraryPositionEditorModal
          isOpen={editorModalOpen}
          libraryDisplayName={activeEditingLibrary.displayName}
          folderName={activeEditingLibrary.folderName}
          images={activeEditingLibrary.images}
          initialPositionsMap={activeEditingLibrary.positionsMap}
          onClose={() => {
            setEditorModalOpen(false);
            setActiveEditingLibrary(null);
          }}
          onSavePositions={handleSavePositions}
        />
      )}
    </div>
  );
};
