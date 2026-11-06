import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Sparkles,
  Save,
  Plus,
  History,
  Link2,
  FileText,
} from "lucide-react";
import type { WikiPageItem } from "../api";
import { SlackMarkdown } from "./SlackMarkdown";

interface WikiViewProps {
  pages: WikiPageItem[];
  initialPath?: string | null;
  onSavePage: (data: { path: string; title: string; content: string }) => Promise<void>;
}

export const WikiView: React.FC<WikiViewProps> = ({
  pages,
  initialPath,
  onSavePage,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(
    initialPath || pages[0]?.path || "memory/AGENTS.md"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPath, setNewPath] = useState("wiki/");

  const activePage =
    pages.find((p) => p.path === selectedPath) || pages[0] || null;

  // Compute bidirectional backlinks ("Linked from")
  const backlinks = useMemo(() => {
    if (!activePage) return [];
    return pages.filter(
      (p) =>
        p.id !== activePage.id &&
        p.content.toLowerCase().includes(`[[${activePage.path.toLowerCase()}`)
    );
  }, [pages, activePage]);

  const startEdit = (page: WikiPageItem) => {
    setEditTitle(page.title);
    setEditContent(page.content);
    setIsEditing(true);
    setIsCreatingNew(false);
  };

  const startCreate = () => {
    setNewPath("wiki/new-note");
    setEditTitle("New Workspace Wiki Page");
    setEditContent("# New Wiki Page\n\nLink to `[[memory/AGENTS.md]]` or write documentation here.");
    setIsCreatingNew(true);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const targetPath = isCreatingNew ? newPath.trim() : activePage?.path;
    if (!targetPath || !editTitle.trim()) return;
    await onSavePage({
      path: targetPath,
      title: editTitle.trim(),
      content: editContent,
    });
    setSelectedPath(targetPath);
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const memoryPages = pages.filter((p) => p.path.startsWith("memory/"));
  const wikiDocPages = pages.filter((p) => !p.path.startsWith("memory/"));

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="h-12 px-6 border-b border-zinc-200/80 flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#efebfe] text-[#5b40d6] flex items-center justify-center">
            <BookOpen size={14} />
          </div>
          <h2 className="font-bold text-zinc-900 text-[14px] tracking-tight">
            Three-Tier Agent Memory & Workspace Wiki
          </h2>
          <span className="text-xs text-zinc-400">
            · Synced to .conclave/memory/ before every agent turn
          </span>
        </div>

        <button
          onClick={startCreate}
          className="px-3 py-1 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <Plus size={13} />
          <span>New Wiki Page</span>
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Tree Sidebar */}
        <div className="w-64 border-r border-zinc-200/80 bg-zinc-50/60 p-3 overflow-y-auto space-y-5 select-none">
          <div>
            <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#5b40d6] flex items-center gap-1">
              <Sparkles size={11} />
              <span>Agent Memory Files</span>
            </div>
            <div className="space-y-0.5">
              {memoryPages.map((p) => {
                const active = !isCreatingNew && activePage?.path === p.path;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPath(p.path);
                      setIsEditing(false);
                      setIsCreatingNew(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      active
                        ? "bg-[#5b40d6] text-white font-semibold shadow-2xs"
                        : "hover:bg-zinc-200/60 text-zinc-700"
                    }`}
                  >
                    <div className="font-mono text-[11.5px] truncate">{p.path}</div>
                    <div
                      className={`text-[10.5px] truncate ${
                        active ? "text-white/80" : "text-zinc-400"
                      }`}
                    >
                      {p.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <FileText size={11} />
              <span>Workspace Wiki ([[...]])</span>
            </div>
            <div className="space-y-0.5">
              {wikiDocPages.map((p) => {
                const active = !isCreatingNew && activePage?.path === p.path;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPath(p.path);
                      setIsEditing(false);
                      setIsCreatingNew(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      active
                        ? "bg-[#5b40d6] text-white font-semibold shadow-2xs"
                        : "hover:bg-zinc-200/60 text-zinc-700"
                    }`}
                  >
                    <div className="font-mono text-[11.5px] truncate">{p.path}</div>
                    <div
                      className={`text-[10.5px] truncate ${
                        active ? "text-white/80" : "text-zinc-400"
                      }`}
                    >
                      {p.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Document Viewer / Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {isCreatingNew && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Page Path (for [[path]] links)
                  </label>
                  <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Markdown Content
                </label>
                <textarea
                  rows={16}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-200 font-mono text-xs leading-relaxed outline-none focus:border-[#5b40d6]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-lg bg-[#5b40d6] hover:bg-[#4b30c2] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>Save Version</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreatingNew(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : activePage ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono px-2 py-0.5 rounded bg-[#efebfe] text-[#5b40d6] font-semibold">
                      [[{activePage.path}]]
                    </code>
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                      <History size={11} />
                      v{activePage.version}
                    </span>
                  </div>
                  <h1 className="text-lg font-bold text-zinc-900 mt-1.5">
                    {activePage.title}
                  </h1>
                </div>

                <button
                  onClick={() => startEdit(activePage)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 text-xs font-semibold transition-colors"
                >
                  Edit Markdown
                </button>
              </div>

              <div className="p-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/30">
                <SlackMarkdown
                  content={activePage.content}
                  onOpenWiki={(path) => setSelectedPath(path)}
                />
              </div>

              {/* Bidirectional Backlinks Section */}
              <div className="pt-4 border-t border-zinc-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2">
                  <Link2 size={12} />
                  <span>Linked from ({backlinks.length})</span>
                </div>
                {backlinks.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">
                    No other wiki pages reference [[{activePage.path}]] yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {backlinks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedPath(b.path)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 flex items-center gap-1.5"
                      >
                        <code className="text-[11px] text-[#5b40d6] font-mono">
                          [[{b.path}]]
                        </code>
                        <span>{b.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
