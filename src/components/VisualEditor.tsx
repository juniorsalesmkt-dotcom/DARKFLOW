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
  Sliders
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

  const canvasRef = useRef<HTMLDivElement>(null);

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
      await onSave({
        ...currentTemplate,
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
                    <PlusIcon className="w-3.5 h-3.5" />
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
                cursor: el.locked ? 'default' : 'pointer'
              };

              return (
                <div
                  key={el.id}
                  style={style}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  className={`group ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-black' : 'hover:ring-1 hover:ring-indigo-400/50'}`}
                >
                  {/* VIDEO PLACEHOLDER */}
                  {el.type === 'video_placeholder' && (
                    <div className="w-full h-full relative overflow-hidden bg-black/70 flex items-center justify-center">
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
                    <label className="text-[10px] text-slate-400 block mb-1">Corte / Crop</label>
                    <select
                      value={selectedElement.crop || 'crop_to_fit'}
                      onChange={e => updateSelectedProperty('crop', e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#141827] border border-[#232a40] text-slate-200 text-xs"
                    >
                      <option value="crop_to_fit">Cortar para encaixar perfeitamente</option>
                      <option value="none">Sem corte (Original)</option>
                    </select>
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
            <div className="py-8 text-center text-slate-500 text-xs">
              <p>Clique em um elemento no canvas ou na lista de camadas para editar suas propriedades.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

function PlusIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
