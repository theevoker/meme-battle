import React, { useState, useEffect } from 'react';
import {
  X,
  Code,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Search,
  LayoutGrid,
  Layers,
  Upload,
  ArrowUpRight
} from 'lucide-react';
import { UserAccount, MemeTemplate, TextPositionConfig, ImageTextPositionsMap } from '../types';
import { LibraryPositionEditorModal } from './LibraryPositionEditorModal';
import { compressImageDataUrl } from '../utils/imageCompressor';

interface DeveloperJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
}

export const DeveloperJsonModal: React.FC<DeveloperJsonModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [viewMode, setViewMode] = useState<'gui' | 'code'>('gui');
  const [jsonText, setJsonText] = useState('');
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Template Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplUrl, setNewTmplUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Position Editor Modal State for individual template
  const [activeEditingTemplate, setActiveEditingTemplate] = useState<MemeTemplate | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBuiltinJson();
    }
  }, [isOpen]);

  const fetchBuiltinJson = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/developer/builtin-json');
      const data = await res.json();
      if (data.success && data.jsonContent) {
        setJsonText(data.jsonContent);
        try {
          const parsed = JSON.parse(data.jsonContent);
          if (Array.isArray(parsed)) {
            setTemplates(parsed);
          }
        } catch (e) {
          console.warn('Failed parsing builtin json:', e);
        }
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Failed to load built-in JSON' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Error connecting to server' });
    } finally {
      setLoading(false);
    }
  };

  // Sync state between GUI and Code Mode
  const syncGuiToCode = (updatedTemplates: MemeTemplate[]) => {
    setTemplates(updatedTemplates);
    setJsonText(JSON.stringify(updatedTemplates, null, 2));
  };

  const handleSwitchToCode = () => {
    setJsonText(JSON.stringify(templates, null, 2));
    setViewMode('code');
  };

  const handleSwitchToGui = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        setTemplates(parsed);
        setViewMode('gui');
        setStatusMsg(null);
      } else {
        setStatusMsg({ type: 'error', text: 'JSON content must be an array of templates' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Invalid JSON syntax: ' + err.message });
    }
  };

  const handleFormatCode = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      if (Array.isArray(parsed)) setTemplates(parsed);
      setStatusMsg({ type: 'success', text: 'JSON formatted successfully' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Invalid JSON syntax: ' + err.message });
    }
  };

  // Template CRUD in GUI
  const handleUpdateTemplateField = (id: string, field: keyof MemeTemplate, val: any) => {
    const updated = templates.map((t) => (t.id === id ? { ...t, [field]: val } : t));
    syncGuiToCode(updated);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    syncGuiToCode(updated);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          const rawUrl = ev.target.result as string;
          const compressed = await compressImageDataUrl(rawUrl);
          setNewTmplUrl(compressed);
          if (!newTmplName) {
            setNewTmplName(file.name.replace(/\.[^/.]+$/, ''));
          }
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed reading image:', err);
      setIsUploading(false);
    }
  };

  const handleAddTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim() || !newTmplUrl.trim()) return;

    const newId = `tmpl_builtin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTemplate: MemeTemplate = {
      id: newId,
      name: newTmplName.trim(),
      url: newTmplUrl.trim(),
      textPositions: [
        {
          id: 'text-1',
          text: 'Text 1',
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
          text: 'Text 2',
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
      ]
    };

    const updated = [newTemplate, ...templates];
    syncGuiToCode(updated);

    setShowAddModal(false);
    setNewTmplName('');
    setNewTmplUrl('');
  };

  // Position Editor save handler
  const handleSavePositionsForTemplate = async (positionsMap: ImageTextPositionsMap) => {
    if (!activeEditingTemplate) return;
    const key = activeEditingTemplate.name || activeEditingTemplate.id;
    const newPositions = positionsMap[key];

    if (newPositions) {
      const updated = templates.map((t) =>
        t.id === activeEditingTemplate.id || t.name === activeEditingTemplate.name
          ? { ...t, textPositions: newPositions }
          : t
      );
      syncGuiToCode(updated);
    }
    setActiveEditingTemplate(null);
  };

  // Save JSON back to server
  const handleSaveToServer = async () => {
    setStatusMsg(null);
    if (!currentUser || currentUser.email.toLowerCase() !== 'itai.vacht@gmail.com') {
      setStatusMsg({
        type: 'error',
        text: 'Unauthorized: Only developer account (itai.vacht@gmail.com) can edit this file.'
      });
      return;
    }

    let finalContent = jsonText;
    if (viewMode === 'gui') {
      finalContent = JSON.stringify(templates, null, 2);
    } else {
      try {
        const parsed = JSON.parse(jsonText);
        finalContent = JSON.stringify(parsed, null, 2);
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: 'Invalid JSON syntax in code view: ' + err.message });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/developer/builtin-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUser.email,
          jsonContent: finalContent
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: data.message || 'Built-in JSON saved successfully on server!' });
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Failed to save JSON' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Server connection error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl flex flex-col h-[88vh] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-3">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">Default Images GUI Manager</h3>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Developer Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Editing built-in templates (<span className="text-purple-300 font-mono">{templates.length} images</span>) as{' '}
                <span className="text-emerald-400 font-bold">itai.vacht@gmail.com</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle Switch */}
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center space-x-1">
              <button
                type="button"
                onClick={handleSwitchToGui}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'gui'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>GUI Editor</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToCode}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'code'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Raw JSON</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Message Alert */}
        {statusMsg && (
          <div
            className={`mb-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          </div>
        )}

        {/* Main Content Area: GUI vs Raw Code */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
            <span>Loading built-in templates from server...</span>
          </div>
        ) : viewMode === 'gui' ? (
          /* ================= GUI VIEW ================= */
          <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
            {/* Action Bar: Search & Add Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter default images by name or ID..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Default Image</span>
              </button>
            </div>

            {/* Template Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-3.5 flex flex-col justify-between space-y-3 shadow-lg transition-all relative group"
                >
                  <div className="flex items-start space-x-3 rtl:space-x-reverse">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
                      <img
                        src={tmpl.url}
                        alt={tmpl.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-600 -z-10">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={tmpl.name}
                        onChange={(e) => handleUpdateTemplateField(tmpl.id, 'name', e.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none truncate"
                        placeholder="Template Name"
                      />

                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
                        <span className="truncate">ID: {tmpl.id}</span>
                      </div>

                      <div className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 inline-block font-mono">
                        {tmpl.textPositions?.length || 2} Text Boxes Configured
                      </div>
                    </div>
                  </div>

                  {/* URL Edit Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={tmpl.url}
                      onChange={(e) => handleUpdateTemplateField(tmpl.id, 'url', e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-300 outline-none truncate"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Bottom Action Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => setActiveEditingTemplate(tmpl)}
                      className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Text Positions (GUI)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
                      title="Delete Default Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ================= CODE VIEW ================= */
          <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl p-3 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs font-mono text-slate-400">
              <span className="flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>builtin_libraries.json</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {jsonText.length} characters
              </span>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="flex-1 w-full bg-slate-950 text-purple-200 font-mono text-xs sm:text-sm p-2 outline-none resize-none leading-relaxed"
              placeholder="// Raw MemeTemplate[] JSON..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchBuiltinJson}
              disabled={loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reload</span>
            </button>
            {viewMode === 'code' && (
              <button
                type="button"
                onClick={handleFormatCode}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Format Code</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveToServer}
              disabled={saving || loading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving to Server...' : 'Save JSON to Server'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add Default Template */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Add New Default Meme Image</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTemplateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Meme Name
                </label>
                <input
                  type="text"
                  required
                  value={newTmplName}
                  onChange={(e) => setNewTmplName(e.target.value)}
                  placeholder="e.g. Surprised Cat"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Image Source
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newTmplUrl}
                    onChange={(e) => setNewTmplUrl(e.target.value)}
                    placeholder="Image URL (https://...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white outline-none"
                  />
                  <div className="text-center text-slate-500 font-bold">OR</div>
                  <label className="border border-dashed border-purple-500/40 hover:border-purple-400 rounded-xl p-3 text-center cursor-pointer bg-purple-950/20 flex items-center justify-center space-x-2 text-purple-300">
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Compressing...' : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>

              {newTmplUrl && (
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-3">
                  <img src={newTmplUrl} alt="Preview" className="w-12 h-12 rounded object-cover border border-slate-700" />
                  <span className="text-slate-300 font-bold truncate">Preview loaded</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTmplName.trim() || !newTmplUrl.trim() || isUploading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  Add to List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Position Editor Modal for Individual Template */}
      {activeEditingTemplate && (
        <LibraryPositionEditorModal
          isOpen={!!activeEditingTemplate}
          libraryDisplayName="Default Built-in Template"
          folderName={activeEditingTemplate.id}
          images={[activeEditingTemplate]}
          initialPositionsMap={{
            [activeEditingTemplate.name || activeEditingTemplate.id]:
              activeEditingTemplate.textPositions || [
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
              ]
          }}
          onClose={() => setActiveEditingTemplate(null)}
          onSavePositions={handleSavePositionsForTemplate}
        />
      )}
    </div>
  );
};
