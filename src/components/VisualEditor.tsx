import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, 
  ArrowLeft, 
  Layers, 
  Type, 
  Image as ImageIcon, 
  Square, 
  Film, 
  Palette, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Copy, 
  Move, 
  Play, 
  Check,
  ChevronDown,
  Sparkles,
  Sliders,
  Plus,
  Upload
} from 'lucide-react';
import { Template, TemplateElement, AspectRatioType } from '../types/index.js';

interface VisualEditorProps {
  template: Template;
  onSave: (updated: Template) => Promise<void>;
  onClose: () => void;
}

export const VisualEditor: React.FC<VisualEditorProps> = ({
  template,
  onSave,
  onClose
}) => {
  const [currentTemplate, setCurrentTemplate] = useState<Template>(JSON.parse(JSON.stringify(template)));
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    currentTemplate.elements.find(e => e.type === 'video_placeholder')?.id || currentTemplate.elements[0]?.id || null
  );
  const [zoom, setZoom] = useState<number>(0.35); // scale factor for canvas
  const [previewVideoActive, setPreviewVideoActive] = useState<boolean>(true);
  const [activeTabLeft, setActiveTabLeft] = useState<'elements' | 'layers'>('elements');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging and resizing state
  const [dragState, setDragState] = useState<{
    elementId: string;
    action: 'move' | 'resize';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  // Ensure template with videoArea has a video_placeholder element
  useEffect(() => {
    const hasVPlaceholder = currentTemplate.elements.some(
      e => e.type === 'video_placeholder' || (e as any).type === 'VIDEO_PLACEHOLDER'
    );
    if (!hasVPlaceholder && currentTemplate.videoArea) {
      const vEl: TemplateElement = {
        id: `el_v_${Date.now()}`,
        name: 'Área do Vídeo (Placeholder)',
        type: 'video_placeholder',
        x: currentTemplate.videoArea.x,
        y: currentTemplate.videoArea.y,
        width: currentTemplate.videoArea.width,
        height: currentTemplate.videoArea.height,
        borderRadius: currentTemplate.videoArea.borderRadius || 24,
        fit: currentTemplate.videoArea.fit || 'cover',
        zIndex: 10,
        opacity: 1,
        borderColor: '#8b5cf6',
        borderWidth: 2
      };
      setCurrentTemplate(prev => ({
        ...prev,
        elements: [vEl, ...prev.elements]
      }));
      setSelectedElementId(vEl.id);
    }
  }, []);

  // Global mouse handlers for drag and resize
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;

      if (dragState.action === 'move') {
        const nextX = Math.max(0, Math.min(currentTemplate.width - 20, Math.round(dragState.initialX + dx)));
        const nextY = Math.max(0, Math.min(currentTemplate.height - 20, Math.round(dragState.initialY + dy)));
        setCurrentTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(el => el.id === dragState.elementId ? { ...el, x: nextX, y: nextY } : el)
        }));
      } else if (dragState.action === 'resize') {
        const nextW = Math.max(80, Math.min(currentTemplate.width, Math.round(dragState.initialW + dx)));
        const nextH = Math.max(80, Math.min(currentTemplate.height, Math.round(dragState.initialH + dy)));
        setCurrentTemplate(prev => ({
          ...prev,
          elements: prev.elements.map(el => el.id === dragState.elementId ? { ...el, width: nextW, height: nextH } : el)
        }));
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, zoom, currentTemplate.width, currentTemplate.height]);

  // Selected element
  const selectedElement = currentTemplate.elements.find(e => e.id === selectedElementId);

  // Aspect ratio presets
  const applyPreset = (ratio: AspectRatioType) => {
    let width = 1080;
    let height = 1920;
    if (ratio === '1:1') {
      height = 1080;
    } else if (ratio === '4:5') {
      height = 1350;
    } else if (ratio === '16:9') {
      width = 1920;
      height = 1080;
    }

    setCurrentTemplate(prev => ({
      ...prev,
      aspectRatio: ratio,
      width,
      height
    }));
  };

  // Add Element
  const addElement = (type: TemplateElement['type']) => {
    const id = `el_${Date.now()}_${Math.round(Math.random() * 1000)}`;
    let newEl: TemplateElement;

    const baseZ = currentTemplate.elements.length + 1;

    switch (type) {
      case 'video_placeholder':
        newEl = {
          id,
          name: 'Área do Vídeo (Placeholder)',
          type: 'video_placeholder',
          x: 40,
          y: 360,
          width: 1000,
          height: 1200,
          zIndex: baseZ,
          opacity: 1,
          fit: 'cover',
          borderRadius: 24,
          borderColor: '#8b5cf6',
          borderWidth: 2
        };
        break;
      case 'text':
        newEl = {
          id,
          name: 'Texto / Headline',
          type: 'text',
          content: 'SEU TEXTO DE IMPACTO AQUI',
          x: 40,
          y: 160,
          width: 1000,
          height: 140,
          zIndex: baseZ,
          opacity: 1,
          color: '#ffffff',
          fontSize: 54,
          fontWeight: '800',
          fontFamily: 'Plus Jakarta Sans',
          textAlign: 'center',
          letterSpacing: 1
        };
        break;
      case 'shape':
        newEl = {
          id,
          name: 'Card de Fundo / Shape',
          type: 'shape',
          x: 40,
          y: 1600,
          width: 1000,
          height: 200,
          zIndex: baseZ,
          opacity: 0.9,
          fill: '#151827',
          borderRadius: 20,
          borderColor: '#2b324a',
          borderWidth: 1
        };
        break;
      case 'image':
        newEl = {
          id,
          name: 'Badge / Logo',
          type: 'image',
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
          x: 460,
          y: 50,
          width: 160,
          height: 160,
          zIndex: baseZ,
          opacity: 1,
          borderRadius: 80
        };
        break;
      default:
        return;
    }

    setCurrentTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, newEl]
    }));
    setSelectedElementId(id);
  };

  // Update selected element property
  const updateSelectedProperty = (field: keyof TemplateElement, value: any) => {
    if (!selectedElementId) return;
    setCurrentTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => {
        if (el.id === selectedElementId) {
          return { ...el, [field]: value };
        }
        return el;
      })
    }));
  };

  // Delete element
  const deleteElement = (id: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(e => e.id !== id)
    }));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Duplicate element
  const duplicateElement = (id: string) => {
    const el = currentTemplate.elements.find(e => e.id === id);
    if (!el) return;
    const duplicated: TemplateElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: `el_${Date.now()}`,
      name: `${el.name} (Cópia)`,
      x: el.x + 30,
      y: el.y + 30,
      zIndex: currentTemplate.elements.length + 1
    };
    setCurrentTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, duplicated]
    }));
    setSelectedElementId(duplicated.id);
  };

  // Move layer up/down
  const moveLayer = (id: string, direction: 'up' | 'down') => {
    const idx = currentTemplate.elements.findIndex(e => e.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx < currentTemplate.elements.length - 1) {
      const next = [...currentTemplate.elements];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      setCurrentTemplate(prev => ({ ...prev, elements: next }));
    } else if (direction === 'down' && idx > 0) {
      const next = [...currentTemplate.elements];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      setCurrentTemplate(prev => ({ ...prev, elements: next }));
    }
  };

  // Toggle lock / hide
  const toggleLock = (id: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(e => e.id === id ? { ...e, locked: !e.locked } : e)
    }));
  };

  const toggleHide = (id: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(e => e.id === id ? { ...e, hidden: !e.hidden } : e)
    }));
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const vSlot = currentTemplate.elements.find(
        e => e.type === 'video_placeholder' || (e as any).type === 'VIDEO_PLACEHOLDER'
      );
      const videoArea = vSlot ? {
        x: Math.round(vSlot.x),
        y: Math.round(vSlot.y),
        width: Math.round(vSlot.width),
        height: Math.round(vSlot.height),
        borderRadius: vSlot.borderRadius || 0,
        fit: vSlot.fit || 'cover'
      } : (currentTemplate.videoArea || {
        x: Math.round(currentTemplate.width * 0.05),
        y: Math.round(currentTemplate.height * 0.15),
        width: Math.round(currentTemplate.width * 0.9),
        height: Math.round(currentTemplate.height * 0.7),
        borderRadius: 24,
        fit: 'cover'
      });

      await onSave({
        ...currentTemplate,
        videoArea,
        thumbnailUrl: currentTemplate.backgroundImageUrl || currentTemplate.thumbnailUrl || '',
        updatedAt: new Date().toISOString()
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090b12] text-slate-200 flex flex-col h-screen overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="h-14 bg-[#0e111a] border-b border-[#1e2335] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1f32] transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <input
              type="text"
              value={currentTemplate.name}
              onChange={e => setCurrentTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="bg-transparent font-bold text-sm text-white focus:outline-hidden focus:border-b border-purple-500 hover:bg-[#151928] px-2 py-0.5 rounded transition-all"
            />
            <span className="text-[10px] text-slate-400 block px-2">Editor Visual de Vídeo Dinâmico</span>
          </div>
        </div>

        {/* Aspect Ratio Selector & Canvas Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#151928] border border-[#242b40] rounded-lg p-0.5 text-xs font-semibold">
            {(['9:16', '1:1', '4:5', '16:9'] as AspectRatioType[]).map(ratio => (
              <button
                key={ratio}
                onClick={() => applyPreset(ratio)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  currentTemplate.aspectRatio === ratio ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#151928] border border-[#242b40] rounded-lg px-2 py-1 text-xs">
            <button onClick={() => setZoom(z => Math.max(0.15, z - 0.05))} className="text-slate-400 hover:text-white">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-slate-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(0.8, z + 0.05))} className="text-slate-400 hover:text-white">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setZoom(0.35)} className="text-slate-500 hover:text-slate-300 ml-1" title="Reset Zoom">
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Test Video Toggle */}
          <button
            onClick={() => setPreviewVideoActive(!previewVideoActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              previewVideoActive 
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' 
                : 'bg-[#151928] text-slate-400 border-[#242b40]'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${previewVideoActive ? 'fill-purple-400' : ''}`} />
            <span>{previewVideoActive ? 'Vídeo Simulado Ativo' : 'Simular Vídeo'}</span>
          </button>

          {/* Save Button */}
          <button
            id="editor-save-btn"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              savedSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30'
            }`}
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Salvando...' : savedSuccess ? 'Salvo!' : 'Salvar Template'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Left Toolbar, Center Canvas, Right Properties) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Element Palette & Layers */}
        <div className="w-64 bg-[#0d0f18] border-r border-[#1e2335] flex flex-col shrink-0">
          <div className="flex border-b border-[#1e2335]">
            <button
              onClick={() => setActiveTabLeft('elements')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTabLeft === 'elements' ? 'border-purple-500 text-purple-300 bg-[#131726]' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Elementos</span>
            </button>
            <button
              onClick={() => setActiveTabLeft('layers')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTabLeft === 'layers' ? 'border-purple-500 text-purple-300 bg-[#131726]' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Camadas ({currentTemplate.elements.length})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTabLeft === 'elements' ? (
              <div className="space-y-3">
                {/* VIDEO PLACEHOLDER HIGHLIGHT */}
                <div className="p-3 rounded-xl bg-linear-to-b from-purple-950/40 to-indigo-950/20 border border-purple-500/40">
                  <div className="flex items-center gap-2 mb-1 text-purple-300">
                    <Film className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Área do Vídeo Dinâmico</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Define onde os vídeos selecionados da biblioteca serão encaixados automaticamente na renderização.
                  </p>
                  <button
                    onClick={() => addElement('video_placeholder')}
                    className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Área de Vídeo</span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Componentes Visuais</span>

                  <button
                    onClick={() => addElement('text')}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-[#141827] hover:bg-[#1b2136] border border-[#232a40] text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <Type className="w-4 h-4 text-indigo-400" />
                    <span>Texto / Título / Subtítulo</span>
                  </button>

                  <button
                    onClick={() => addElement('shape')}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-[#141827] hover:bg-[#1b2136] border border-[#232a40] text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <Square className="w-4 h-4 text-sky-400" />
                    <span>Shape / Moldura / Card</span>
                  </button>

                  <button
                    onClick={() => addElement('image')}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-[#141827] hover:bg-[#1b2136] border border-[#232a40] text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Imagem / Badge / Selo</span>
                  </button>
                </div>

                {/* Template Background Color */}
                <div className="pt-4 border-t border-[#1e2335]">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cor de Fundo do Template</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentTemplate.background.startsWith('#') ? currentTemplate.background : '#090a0f'}
                      onChange={e => setCurrentTemplate(prev => ({ ...prev, background: e.target.value }))}
                      className="w-8 h-8 rounded border border-[#242b40] bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={currentTemplate.background}
                      onChange={e => setCurrentTemplate(prev => ({ ...prev, background: e.target.value }))}
                      className="flex-1 px-2.5 py-1 text-xs rounded bg-[#141827] border border-[#232a40] text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* Background Image / Overlay Frame */}
                <div className="pt-4 border-t border-[#1e2335] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400">Imagem de Fundo / Moldura</label>
                    {currentTemplate.backgroundImageUrl && (
                      <button
                        onClick={() => setCurrentTemplate(prev => ({ ...prev, backgroundImageUrl: undefined, backgroundImagePath: undefined }))}
                        className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={bgFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingBg(true);
                      try {
                        const formData = new FormData();
                        formData.append('image', file);
                        const res = await fetch('/api/templates/upload-image', {
                          method: 'POST',
                          body: formData
                        });
                        if (!res.ok) throw new Error('Falha no upload da imagem');
                        const data = await res.json();
                        setCurrentTemplate(prev => ({
                          ...prev,
                          backgroundImageUrl: data.imageUrl,
                          backgroundImagePath: data.imagePath,
                          thumbnailUrl: data.imageUrl
                        }));
                      } catch (err: any) {
                        alert(err?.message || 'Erro no upload');
                      } finally {
                        setIsUploadingBg(false);
                        if (bgFileInputRef.current) bgFileInputRef.current.value = '';
                      }
                    }}
                  />

                  {currentTemplate.backgroundImageUrl ? (
                    <div className="space-y-2">
                      <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-[#242b40] group">
                        <img 
                          src={currentTemplate.backgroundImageUrl} 
                          alt="Background" 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          onClick={() => bgFileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-bold text-white"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Trocar Imagem</span>
                        </button>
                      </div>

                      <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!currentTemplate.isOverlayFrame}
                          onChange={e => setCurrentTemplate(prev => ({ ...prev, isOverlayFrame: e.target.checked }))}
                          className="rounded border-[#2c344e] bg-[#141827] text-purple-600 focus:ring-purple-500/20"
                        />
                        <span>Usar como Moldura de Sobreposição (frente do vídeo)</span>
                      </label>
                    </div>
                  ) : (
                    <button
                      onClick={() => bgFileInputRef.current?.click()}
                      disabled={isUploadingBg}
                      className="w-full py-2 px-3 rounded-lg bg-[#141827] hover:bg-[#1b2136] border border-dashed border-[#2b334d] hover:border-purple-500/50 text-xs font-semibold text-slate-300 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isUploadingBg ? 'Enviando imagem...' : 'Carregar Imagem de Fundo'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Layers Tab */
              <div className="space-y-1.5">
                {[...currentTemplate.elements].reverse().map(el => {
                  const isSelected = selectedElementId === el.id;
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`
                        p-2 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-all
                        ${isSelected ? 'bg-purple-600/20 border-purple-500/50 text-purple-200' : 'bg-[#141827] border-[#22283d] text-slate-300 hover:bg-[#191e32]'}
                      `}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {el.type === 'video_placeholder' && <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        {el.type === 'text' && <Type className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        {el.type === 'shape' && <Square className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        {el.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        <span className="truncate text-xs font-semibold">{el.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleHide(el.id)}
                          className="p-1 text-slate-400 hover:text-white"
                          title={el.hidden ? 'Mostrar' : 'Ocultar'}
                        >
                          {el.hidden ? <EyeOff className="w-3 h-3 text-rose-400" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => toggleLock(el.id)}
                          className="p-1 text-slate-400 hover:text-white"
                          title={el.locked ? 'Desbloquear' : 'Bloquear'}
                        >
                          {el.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => duplicateElement(el.id)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Duplicar"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteElement(el.id)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CENTER WORKSPACE: Visual Canvas */}
        <div className="flex-1 bg-[#06070b] overflow-auto flex items-center justify-center p-8 relative">
          <div
            ref={canvasRef}
            style={{
              width: `${currentTemplate.width * zoom}px`,
              height: `${currentTemplate.height * zoom}px`,
              background: currentTemplate.background,
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px #22273d'
            }}
            className="relative transition-all duration-75 overflow-hidden rounded-md shrink-0"
            onClick={() => setSelectedElementId(null)}
          >
            {/* Background Image (Standard under-layer) */}
            {currentTemplate.backgroundImageUrl && !currentTemplate.isOverlayFrame && (
              <img
                src={currentTemplate.backgroundImageUrl}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
              />
            )}

            {/* Render Elements */}
            {currentTemplate.elements.map(el => {
              if (el.hidden) return null;
              const isSelected = selectedElementId === el.id;

              const style: React.CSSProperties = {
                position: 'absolute',
                left: `${el.x * zoom}px`,
                top: `${el.y * zoom}px`,
                width: `${el.width * zoom}px`,
                height: `${el.height * zoom}px`,
                opacity: el.opacity,
                zIndex: el.zIndex || 1,
                borderRadius: el.borderRadius ? `${el.borderRadius * zoom}px` : undefined,
                border: el.borderColor && el.borderWidth 
                  ? `${Math.max(1, (el.borderWidth || 1) * zoom)}px solid ${el.borderColor}`
                  : undefined,
                cursor: el.locked ? 'default' : 'move'
              };

              return (
                <div
                  key={el.id}
                  style={style}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  onMouseDown={e => {
                    if (el.locked) return;
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                    setDragState({
                      elementId: el.id,
                      action: 'move',
                      startX: e.clientX,
                      startY: e.clientY,
                      initialX: el.x,
                      initialY: el.y,
                      initialW: el.width,
                      initialH: el.height
                    });
                  }}
                  className={`group ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-black' : 'hover:ring-1 hover:ring-indigo-400/50'}`}
                >
                  {/* Resize Handle for Selected Element */}
                  {isSelected && !el.locked && (
                    <div
                      onMouseDown={e => {
                        e.stopPropagation();
                        setDragState({
                          elementId: el.id,
                          action: 'resize',
                          startX: e.clientX,
                          startY: e.clientY,
                          initialX: el.x,
                          initialY: el.y,
                          initialW: el.width,
                          initialH: el.height
                        });
                      }}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-500 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md"
                      title="Redimensionar área"
                    />
                  )}

                  {/* VIDEO PLACEHOLDER */}
                  {el.type === 'video_placeholder' && (
                    <div 
                      style={{ borderRadius: el.borderRadius ? `${el.borderRadius * zoom}px` : undefined }}
                      className="w-full h-full relative overflow-hidden bg-black/70 flex items-center justify-center"
                    >
                      {previewVideoActive ? (
                        <div className="w-full h-full relative">
                          <img
                            src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80"
                            alt="Mockup Video"
                            className={`w-full h-full ${el.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-purple-600 text-white font-mono text-[9px] font-bold">
                            VÍDEO DINÂMICO
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 text-center">
                          <Film className="w-8 h-8 text-purple-400 mx-auto mb-1 opacity-70" />
                          <p className="text-[10px] font-mono text-purple-300 font-bold uppercase">Área Dinâmica do Vídeo</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{el.width}x{el.height} • Fit: {el.fit || 'cover'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TEXT ELEMENT */}
                  {el.type === 'text' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        color: el.color || '#ffffff',
                        fontSize: `${(el.fontSize || 32) * zoom}px`,
                        fontWeight: el.fontWeight || '700',
                        fontFamily: el.fontFamily || 'Plus Jakarta Sans',
                        textAlign: (el.textAlign as any) || 'center',
                        letterSpacing: el.letterSpacing ? `${el.letterSpacing * zoom}px` : undefined,
                        lineHeight: 1.2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center',
                        wordBreak: 'break-word',
                        padding: `${8 * zoom}px`
                      }}
                    >
                      {el.content}
                    </div>
                  )}

                  {/* SHAPE ELEMENT */}
                  {el.type === 'shape' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: el.fill || '#151827',
                        borderRadius: el.borderRadius ? `${el.borderRadius * zoom}px` : undefined
                      }}
                    />
                  )}

                  {/* IMAGE ELEMENT */}
                  {el.type === 'image' && (
                    <img
                      src={el.imageUrl}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: el.borderRadius ? `${el.borderRadius * zoom}px` : undefined
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Overlay Frame (over elements/video) */}
            {currentTemplate.backgroundImageUrl && currentTemplate.isOverlayFrame && (
              <img
                src={currentTemplate.backgroundImageUrl}
                alt="Overlay Frame"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-40"
              />
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Properties Inspector */}
        <div className="w-72 bg-[#0d0f18] border-l border-[#1e2335] flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          <div className="border-b border-[#1e2335] pb-2">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
              {selectedElement ? selectedElement.name : 'Configurações do Template'}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {selectedElement ? `Tipo: ${selectedElement.type.toUpperCase()}` : `${currentTemplate.width}x${currentTemplate.height} px`}
            </span>
          </div>

          {selectedElement ? (
            <div className="space-y-4 text-xs">
              {/* Position & Size Grid */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1.5">Dimensões & Posição</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">X (px)</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={e => updateSelectedProperty('x', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Y (px)</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={e => updateSelectedProperty('y', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Largura (W)</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.width)}
                      onChange={e => updateSelectedProperty('width', parseFloat(e.target.value) || 10)}
                      className="w-full px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Altura (H)</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.height)}
                      onChange={e => updateSelectedProperty('height', parseFloat(e.target.value) || 10)}
                      className="w-full px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SPECIFIC: VIDEO PLACEHOLDER PROPERTIES */}
              {selectedElement.type === 'video_placeholder' && (
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <span className="text-[10px] font-extrabold text-purple-300 uppercase font-mono block">Encaixe do Vídeo</span>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Ajuste de Escala (Fit)</label>
                    <select
                      value={selectedElement.fit || 'cover'}
                      onChange={e => updateSelectedProperty('fit', e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs"
                    >
                      <option value="cover">COVER (Preencher sem faixas pretas)</option>
                      <option value="contain">CONTAIN (Manter proporção original com bordas)</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Arredondamento dos Cantos</span>
                      <span className="font-mono text-purple-300">{selectedElement.borderRadius || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={selectedElement.borderRadius || 0}
                      onChange={e => updateSelectedProperty('borderRadius', parseInt(e.target.value, 10))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1.5 font-bold uppercase">Atalhos Rápidos de Área</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const size = Math.min(currentTemplate.width - 80, 960);
                          updateSelectedProperty('width', size);
                          updateSelectedProperty('height', size);
                          updateSelectedProperty('x', Math.round((currentTemplate.width - size) / 2));
                          updateSelectedProperty('y', Math.round((currentTemplate.height - size) / 2));
                        }}
                        className="p-1.5 rounded bg-[#141827] hover:bg-[#1f253b] border border-[#242b40] text-[10px] font-mono text-slate-300 text-center"
                      >
                        Centro (1:1)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedProperty('width', currentTemplate.width);
                          updateSelectedProperty('height', currentTemplate.height);
                          updateSelectedProperty('x', 0);
                          updateSelectedProperty('y', 0);
                        }}
                        className="p-1.5 rounded bg-[#141827] hover:bg-[#1f253b] border border-[#242b40] text-[10px] font-mono text-slate-300 text-center"
                      >
                        Tela Cheia (Full)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SPECIFIC: TEXT PROPERTIES */}
              {selectedElement.type === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Conteúdo do Texto</label>
                    <textarea
                      rows={2}
                      value={selectedElement.content || ''}
                      onChange={e => updateSelectedProperty('content', e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Tamanho (px)</label>
                      <input
                        type="number"
                        value={selectedElement.fontSize || 32}
                        onChange={e => updateSelectedProperty('fontSize', parseInt(e.target.value, 10))}
                        className="w-full px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Peso (Weight)</label>
                      <select
                        value={selectedElement.fontWeight || '700'}
                        onChange={e => updateSelectedProperty('fontWeight', e.target.value)}
                        className="w-full px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs"
                      >
                        <option value="400">Regular (400)</option>
                        <option value="600">Semibold (600)</option>
                        <option value="800">Extra Bold (800)</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Cor do Texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.color || '#ffffff'}
                        onChange={e => updateSelectedProperty('color', e.target.value)}
                        className="w-7 h-7 rounded border border-[#242b40] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedElement.color || '#ffffff'}
                        onChange={e => updateSelectedProperty('color', e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SPECIFIC: SHAPE PROPERTIES */}
              {selectedElement.type === 'shape' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Cor de Preenchimento (Fill)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.fill?.startsWith('#') ? selectedElement.fill : '#151827'}
                        onChange={e => updateSelectedProperty('fill', e.target.value)}
                        className="w-7 h-7 rounded border border-[#242b40] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedElement.fill || '#151827'}
                        onChange={e => updateSelectedProperty('fill', e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Border & Radius */}
              <div className="space-y-2 pt-2 border-t border-[#1e2335]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Raio (Border Radius)</label>
                    <input
                      type="number"
                      value={selectedElement.borderRadius || 0}
                      onChange={e => updateSelectedProperty('borderRadius', parseInt(e.target.value, 10))}
                      className="w-full px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Espessura Borda</label>
                    <input
                      type="number"
                      value={selectedElement.borderWidth || 0}
                      onChange={e => updateSelectedProperty('borderWidth', parseInt(e.target.value, 10))}
                      className="w-full px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Cor da Borda</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedElement.borderColor || '#8b5cf6'}
                      onChange={e => updateSelectedProperty('borderColor', e.target.value)}
                      className="w-7 h-7 rounded border border-[#242b40] bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedElement.borderColor || '#8b5cf6'}
                      onChange={e => updateSelectedProperty('borderColor', e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Layer Actions */}
              <div className="pt-3 border-t border-[#1e2335] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveLayer(selectedElement.id, 'up')}
                    className="px-2 py-1 rounded bg-[#151928] text-slate-300 hover:text-white border border-[#22283d] text-[10px]"
                  >
                    Mover ↑
                  </button>
                  <button
                    onClick={() => moveLayer(selectedElement.id, 'down')}
                    className="px-2 py-1 rounded bg-[#151928] text-slate-300 hover:text-white border border-[#22283d] text-[10px]"
                  >
                    Mover ↓
                  </button>
                </div>

                <button
                  onClick={() => deleteElement(selectedElement.id)}
                  className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Excluir Elemento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Template Global Properties */
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#141827] border border-[#22273b] space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dimensões do Template</span>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Resolução:</span>
                  <span className="font-mono text-purple-300">{currentTemplate.width} x {currentTemplate.height}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Proporção:</span>
                  <span className="font-mono text-purple-300">{currentTemplate.aspectRatio}</span>
                </div>
              </div>

              {/* Area de Vídeo Status */}
              {currentTemplate.elements.some(e => e.type === 'video_placeholder') ? (
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
                  <span className="text-[10px] font-extrabold text-purple-300 uppercase font-mono block mb-1">
                    Área de Vídeo Ativa
                  </span>
                  <p className="text-[11px] text-slate-400 mb-2">
                    O template já possui um espaço configurado para o vídeo.
                  </p>
                  <button
                    onClick={() => {
                      const vEl = currentTemplate.elements.find(e => e.type === 'video_placeholder');
                      if (vEl) setSelectedElementId(vEl.id);
                    }}
                    className="w-full py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold transition-colors"
                  >
                    Selecionar e Ajustar Área
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <span className="text-[10px] font-extrabold text-amber-300 uppercase font-mono block mb-1">
                    Sem Área de Vídeo
                  </span>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Adicione o enquadramento onde o vídeo final será renderizado.
                  </p>
                  <button
                    onClick={() => addElement('video_placeholder')}
                    className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Área de Vídeo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
