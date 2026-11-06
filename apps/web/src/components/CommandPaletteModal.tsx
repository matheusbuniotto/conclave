import React, { useState, useMemo } from "react";
import {
  Search,
  Hash,
  Bot,
  LayoutGrid,
  Inbox,
  MessageSquare,
  Shield,
  BookOpen,
  Cpu,
} from "lucide-react";
import type {
  ChannelItem,
  BotItem,
  WorkspaceAppItem,
  WikiPageItem,
} from "../api";
import type { NavView } from "./Sidebar";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ChannelItem[];
  bots: BotItem[];
  apps: WorkspaceAppItem[];
  wikiPages: WikiPageItem[];
  onSelectChannel: (channelId: string) => void;
  onSelectView: (view: NavView) => void;
  onOpenApp: (app: WorkspaceAppItem) => void;
  onOpenBot: (bot: BotItem) => void;
  onOpenWikiPath: (path: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  channels,
  bots,
  apps,
  wikiPages,
  onSelectChannel,
  onSelectView,
  onOpenApp,
  onOpenBot,
  onOpenWikiPath,
}) => {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Array<{
      id: string;
      category: string;
      label: string;
      sublabel: string;
      icon: any;
      action: () => void;
    }> = [];

    // Navigation views
    const navs: Array<{ id: NavView; label: string; sub: string; icon: any }> = [
      { id: "feed", label: "Go to Personal Triage Feed", sub: "Approvals & External Drafts", icon: Inbox },
      { id: "threads", label: "Go to Threads", sub: "All active discussions", icon: MessageSquare },
      { id: "apps", label: "Go to Internal Apps", sub: "Side-by-side tools & DBs", icon: LayoutGrid },
      { id: "machines", label: "Go to Machines & Browser", sub: "Cloud VMs & Sign-in Handoff", icon: Cpu },
      { id: "vault", label: "Go to Vault & Egress Proxy", sub: "4-level secret rules & audit", icon: Shield },
      { id: "wiki", label: "Go to Memory & Wiki", sub: "AGENTS.md, SOUL.md & [[wiki]]", icon: BookOpen },
    ];

    for (const n of navs) {
      if (!q || n.label.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q)) {
        items.push({
          id: `nav-${n.id}`,
          category: "Navigation",
          label: n.label,
          sublabel: n.sub,
          icon: n.icon,
          action: () => {
            onSelectView(n.id);
            onClose();
          },
        });
      }
    }

    for (const ch of channels) {
      if (!q || ch.name.toLowerCase().includes(q) || (ch.topic && ch.topic.toLowerCase().includes(q))) {
        items.push({
          id: `ch-${ch.id}`,
          category: "Channel",
          label: `#${ch.name}`,
          sublabel: ch.topic || "Channel",
          icon: Hash,
          action: () => {
            onSelectChannel(ch.id);
            onSelectView("chat");
            onClose();
          },
        });
      }
    }

    for (const app of apps) {
      if (!q || app.title.toLowerCase().includes(q) || app.slug.toLowerCase().includes(q)) {
        items.push({
          id: `app-${app.id}`,
          category: "Internal App",
          label: app.title,
          sublabel: `v${app.currentVersion} • Open side-by-side`,
          icon: LayoutGrid,
          action: () => {
            onOpenApp(app);
            onClose();
          },
        });
      }
    }

    for (const bot of bots) {
      if (!q || bot.name.toLowerCase().includes(q) || bot.handle.toLowerCase().includes(q)) {
        items.push({
          id: `bot-${bot.id}`,
          category: "Agent",
          label: `${bot.name} (@${bot.handle})`,
          sublabel: bot.description || bot.engine,
          icon: Bot,
          action: () => {
            onOpenBot(bot);
            onClose();
          },
        });
      }
    }

    for (const w of wikiPages) {
      if (!q || w.path.toLowerCase().includes(q) || w.title.toLowerCase().includes(q)) {
        items.push({
          id: `wiki-${w.id}`,
          category: "Memory / Wiki",
          label: `[[${w.path}]]`,
          sublabel: w.title,
          icon: BookOpen,
          action: () => {
            onOpenWikiPath(w.path);
            onSelectView("wiki");
            onClose();
          },
        });
      }
    }

    return items.slice(0, 12);
  }, [query, channels, bots, apps, wikiPages, onSelectChannel, onSelectView, onOpenApp, onOpenBot, onOpenWikiPath, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-3">
          <Search size={16} className="text-[#5b40d6]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results[0]) results[0].action();
            }}
            placeholder="Jump to channel, internal app, agent, or [[wiki]] page..."
            className="flex-1 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
          {results.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full px-4 py-2.5 text-left hover:bg-[#efebfe]/40 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-zinc-900 truncate">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {item.sublabel}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 flex-shrink-0">
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
