import React, { useState, useRef } from 'react';
import { 
  LayoutTemplate, 
  Plus, 
  Edit3, 
  Copy, 
  Trash2, 
  Play, 
  Sparkles, 
  Film, 
  Clock, 
  MoreVertical,
  ExternalLink,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { Template, Page } from '../types/index.js';

interface TemplatesViewProps {
  templates: Template[];
  pages: Page[];
  selectedPageId: string;
  onOpenEditor: (template: Template) => void;
  onCreateNewTemplate: () => void;
  onCreateTemplateFromImage?: (file: File) => Promise<void>;
  onDuplicateTemplate: (id: string) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onUseTemplateInProduction: (templateId: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  pages,
  selectedPageId,
  onOpenEditor,
  onCreateNewTemplate,
  onCreateTemplateFromImage,
  onDuplicateTemplate,
  onDeleteTemplate,
  onUseTemplateInProduction
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = templates.filter(t => {
    if (selectedPageId && t.pageId !== selectedPageId) return false;
    return true;
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir o template "${name}"?`)) {
      onDeleteTemplate(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Meus Templates Visuais</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Crie templates a partir de imagens personalizadas ou modelos em branco e defina a área do vídeo para renderização automática.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={imageFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !onCreateTemplateFromImage) return;
              setIsUploading(true);
              try {
                await onCreateTemplateFromImage(file);
              } catch (err: any) {
                alert(`Erro ao criar template: ${err?.message || 'Falha no envio'}`);
              } finally {
                setIsUploading(false);
                if (imageFileInputRef.current) imageFileInputRef.current.value = '';
              }
            }}
          />

          <button
            id="btn-new-template-image"
            onClick={() => imageFileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4" />
            <span>{isUploading ? 'Enviando Imagem...' : '+ CRIAR A PARTIR DE IMAGEM'}</span>
          </button>

          <button
            id="btn-new-template"
            onClick={onCreateNewTemplate}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1a1f33] hover:bg-[#232a45] border border-[#2d3654] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Template em Branco</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredTemplates.map(tpl => {
          const page = pages.find(p => p.id === tpl.pageId);
          const hasVideoPlaceholder = tpl.elements.some(e => e.type === 'video_placeholder') || !!tpl.videoArea;

          return (
            <div
              key={tpl.id}
              className="rounded-2xl bg-[#121522] border border-[#22273b] hover:border-purple-500/50 transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-lg"
            >
              <div>
                {/* Visual Thumbnail Area */}
                <div 
                  onClick={() => onOpenEditor(tpl)}
                  className="relative aspect-9/16 max-h-[300px] w-full bg-[#08090f] overflow-hidden cursor-pointer border-b border-[#1b2032] flex items-center justify-center"
                >
                  {/* Miniature rendered mockup of the elements */}
                  <div 
                    style={{ background: tpl.background }}
                    className="w-full h-full relative"
                  >
                    {/* Background image preview if template has backgroundImageUrl */}
                    {tpl.backgroundImageUrl && (
                      <img 
                        src={tpl.backgroundImageUrl} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover" 
                      />
                    )}

                    {/* Direct videoArea if elements don't have video_placeholder */}
                    {!tpl.elements.some(e => e.type === 'video_placeholder') && tpl.videoArea && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${(tpl.videoArea.x / tpl.width) * 100}%`,
                          top: `${(tpl.videoArea.y / tpl.height) * 100}%`,
                          width: `${(tpl.videoArea.width / tpl.width) * 100}%`,
                          height: `${(tpl.videoArea.height / tpl.height) * 100}%`,
                          borderRadius: '4px',
                          border: '2px dashed #8b5cf6'
                        }}
                        className="bg-purple-900/50 flex items-center justify-center overflow-hidden z-10"
                      >
                        <Film className="w-5 h-5 text-purple-300 opacity-80" />
                      </div>
                    )}

                    {tpl.elements.map(el => {
                      if (el.hidden) return null;
                      const scale = 0.25; // thumbnail scale
                      const posX = (el.x / tpl.width) * 100;
                      const posY = (el.y / tpl.height) * 100;
                      const widthPercent = (el.width / tpl.width) * 100;
                      const heightPercent = (el.height / tpl.height) * 100;

                      if (el.type === 'video_placeholder') {
                        return (
                          <div
                            key={el.id}
                            style={{
                              position: 'absolute',
                              left: `${posX}%`,
                              top: `${posY}%`,
                              width: `${widthPercent}%`,
                              height: `${heightPercent}%`,
                              borderRadius: '4px',
                              border: '1px dashed #8b5cf6'
                            }}
                            className="bg-purple-900/40 flex items-center justify-center overflow-hidden"
                          >
                            <img
                              src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80"
                              alt=""
                              className="w-full h-full object-cover opacity-60"
                            />
                          </div>
                        );
                      }

                      if (el.type === 'text') {
                        return (
                          <div
                            key={el.id}
                            style={{
                              position: 'absolute',
                              left: `${posX}%`,
                              top: `${posY}%`,
                              width: `${widthPercent}%`,
                              height: `${heightPercent}%`,
                              color: el.color || '#fff',
                              fontSize: '8px',
                              fontWeight: 800,
                              textAlign: 'center'
                            }}
                            className="truncate px-1"
                          >
                            {el.content}
                          </div>
                        );
                      }

                      if (el.type === 'shape') {
                        return (
                          <div
                            key={el.id}
                            style={{
                              position: 'absolute',
                              left: `${posX}%`,
                              top: `${posY}%`,
                              width: `${widthPercent}%`,
                              height: `${heightPercent}%`,
                              backgroundColor: el.fill || '#151827',
                              borderRadius: '3px'
                            }}
                          />
                        );
                      }

                      return null;
                    })}
                  </div>

                  {/* Hover Overlay with "EDITAR" */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>EDITAR NO CANVAS</span>
                    </button>
                  </div>

                  {/* Aspect Ratio Badge */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-purple-300 border border-purple-500/30">
                    {tpl.aspectRatio} ({tpl.width}x{tpl.height})
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white truncate" title={tpl.name}>
                      {tpl.name}
                    </h2>
                    {page && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {page.name}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {tpl.description || 'Template dinâmico customizado para reels e shorts.'}
                  </p>

                  <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      {tpl.elements.length} camadas
                    </span>
                    <span>•</span>
                    <span className="text-purple-300 font-semibold">
                      {hasVideoPlaceholder ? 'Placeholder Ativo' : 'Sem Placeholder'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-4 py-3 bg-[#0d101a] border-t border-[#1b2032] flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenEditor(tpl)}
                    title="Editar Template"
                    className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-[#1a1f33] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDuplicateTemplate(tpl.id)}
                    title="Duplicar Template"
                    className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-[#1a1f33] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    title="Excluir Template"
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-[#1a1f33] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onUseTemplateInProduction(tpl.id)}
                  className="px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>USAR</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
