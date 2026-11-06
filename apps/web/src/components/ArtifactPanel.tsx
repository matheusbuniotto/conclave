import React, { useRef, useState } from "react";
import { X, ExternalLink, RotateCw, AppWindow } from "lucide-react";

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
    <div className="w-[480px] lg:w-[540px] border-l border-zinc-200/90 bg-white flex flex-col flex-shrink-0 z-20 h-full shadow-lg transition-all duration-200">
      {/* Split Pane Header (macOS Utility Style) */}
      <div className="h-12 border-b border-zinc-200/90 px-4 flex items-center justify-between flex-shrink-0 bg-zinc-50/70 select-none">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-5 h-5 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 flex-shrink-0">
            <AppWindow size={13} />
          </div>
          <div className="truncate">
            <h3 className="font-semibold text-zinc-900 text-[13px] truncate leading-tight tracking-tight">
              {artifact.appTitle}
            </h3>
            <span className="text-[10.5px] text-zinc-400 font-normal flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Preview • Port {artifact.containerPort || 3000}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className={`p-1.5 text-zinc-500 hover:text-zinc-800 rounded-md hover:bg-zinc-200/60 transition-colors ${
              isRefreshing ? "animate-spin text-zinc-800" : ""
            }`}
            title="Reload Preview"
          >
            <RotateCw size={13} />
          </button>

          <a
            href={artifact.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-md hover:bg-zinc-200/60 transition-colors"
            title="Open in new window"
          >
            <ExternalLink size={13} />
          </a>

          <div className="w-[1px] h-3.5 bg-zinc-200 mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200/60 transition-colors"
            title="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 w-full h-full bg-zinc-100 relative">
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

