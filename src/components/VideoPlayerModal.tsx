import React, { useState, useEffect } from 'react';
import { X, Download, Play, Info } from 'lucide-react';
import { Video } from '../types/index.js';
import { LocalMediaStorage } from '../services/LocalMediaStorage.js';

interface VideoPlayerModalProps {
  video: Partial<Video> | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  if (!video) return null;

  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function resolveSource() {
      const rawUrl = video?.originalUrl || video?.downloadUrl || video?.sourceUrl;
      if (rawUrl && !rawUrl.startsWith('local://')) {
        setResolvedUrl(rawUrl);
        return;
      }
      if (video?.id) {
        const local = await LocalMediaStorage.getVideoUrl(video.id);
        if (isMounted && local) {
          setResolvedUrl(local);
          return;
        }
      }
      setResolvedUrl(rawUrl || null);
    }
    resolveSource();
    return () => { isMounted = false; };
  }, [video]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0f111c] border border-[#262c42] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-[#141726] border-b border-[#21273d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-white truncate max-w-md">{video.name}</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black flex items-center justify-center min-h-[360px] max-h-[520px]">
          {resolvedUrl ? (
            <video
              src={resolvedUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[500px] w-auto max-w-full rounded"
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              <p>Mídia não disponível para streaming.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#111420] border-t border-[#1e2336] flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
            {video.duration && <span>Duração: {Math.round(video.duration)}s</span>}
            {video.width && video.height && <span>Resolução: {video.width}x{video.height}</span>}
          </div>

          {resolvedUrl && (
            <a
              href={resolvedUrl}
              download={video.name ? `${video.name}.mp4` : 'video.mp4'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
