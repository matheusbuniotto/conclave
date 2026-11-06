import React, { useRef, useState } from "react";
import { X, ExternalLink, RotateCw, Play, CheckCircle2 } from "lucide-react";

export interface ActiveAppArtifact {
  appTitle: string;
  appUrl: string;
  sandboxId?: string;
  containerPort?: number;
}

interface ArtifactPanelProps {
  artifact: ActiveAppArtifact | null;
  onClose: () => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!artifact) return null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (iframeRef.current) {
      iframeRef.current.src = artifact.appUrl;
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="w-[460px] lg:w-[520px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0 z-20 h-full shadow-lg transition-all duration-200">
      {/* Split Pane Header */}
      <div className="h-13 border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0 bg-gray-50/70">
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={13} />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-gray-900 text-sm truncate leading-tight">
              {artifact.appTitle}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Micro-App
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className={`p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-200/60 transition-colors ${
              isRefreshing ? "animate-spin text-blue-600" : ""
            }`}
            title="Reload App"
          >
            <RotateCw size={14} />
          </button>

          <a
            href={artifact.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-200/60 transition-colors"
            title="Open in new window"
          >
            <ExternalLink size={14} />
          </a>

          <div className="w-[1px] h-4 bg-gray-300 mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-200/60 transition-colors"
            title="Close Split Pane"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 w-full h-full bg-gray-100 relative">
        <iframe
          ref={iframeRef}
          src={artifact.appUrl}
          title={artifact.appTitle}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
};
