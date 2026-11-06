import React from "react";
import { X, Sparkles, Hash, Plus, Check, Terminal, ExternalLink, MessageSquare } from "lucide-react";
import type { BotItem, ChannelItem } from "../api";
import { BotFace } from "./BotFace";

interface BotProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: BotItem | null;
  channels: ChannelItem[];
  onToggleChannel: (botUserId: string, channelId: string, isCurrentlyIn: boolean) => Promise<void>;
  onSendMessageToBot?: (bot: BotItem) => void;
}

export const BotProfileModal: React.FC<BotProfileModalProps> = ({
  isOpen,
  onClose,
  bot,
  channels,
  onToggleChannel,
  onSendMessageToBot,
}) => {
  if (!isOpen || !bot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cover / Profile Banner */}
        <div className="h-28 bg-gradient-to-br from-zinc-900 to-zinc-800 relative flex items-center justify-center p-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>

          {/* Interactive Animated Bot Face */}
          <div className="absolute -bottom-9 left-6 p-2 rounded-2xl bg-white border border-zinc-200 shadow-md">
            <BotFace look={bot.avatarLabel || "1.7.0.0"} size={56} />
          </div>
        </div>

        {/* Profile Content */}
        <div className="pt-12 px-6 pb-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  <span>{bot.name}</span>
                  <span className="text-[10px] font-mono uppercase bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200">
                    {bot.engine}
                  </span>
                </h2>
                <div className="text-[12px] text-zinc-400 font-mono mt-0.5">
                  @{bot.handle}
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Sandbox
              </div>
            </div>

            {bot.description && (
              <p className="text-[12.5px] text-zinc-600 mt-2.5 leading-relaxed">
                {bot.description}
              </p>
            )}
          </div>

          {/* Persona & System Instructions */}
          {bot.systemPrompt && (
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                <Sparkles size={11} />
                <span>Persona & Instructions</span>
              </div>
              <p className="text-[12px] text-zinc-700 leading-relaxed font-mono whitespace-pre-wrap">
                {bot.systemPrompt}
              </p>
            </div>
          )}

          {/* Channels Membership */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium tracking-wide uppercase text-zinc-500">
                Channel Access ({bot.channelIds.length} of {channels.length})
              </span>
            </div>

            <div className="border border-zinc-200/80 rounded-xl divide-y divide-zinc-100 max-h-40 overflow-y-auto bg-zinc-50/40">
              {channels.map((ch) => {
                const isInChannel = bot.channelIds.includes(ch.id);

                return (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-zinc-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Hash size={13} className="text-zinc-400" />
                      <span className="font-medium text-zinc-800 text-[12px]">{ch.name}</span>
                    </div>

                    <button
                      onClick={() => onToggleChannel(bot.userId, ch.id, isInChannel)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border flex items-center gap-1 ${
                        isInChannel
                          ? "bg-white border-zinc-200 text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          : "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800 shadow-2xs"
                      }`}
                    >
                      {isInChannel ? (
                        <>
                          <Check size={11} className="text-emerald-500" />
                          <span>In Channel</span>
                        </>
                      ) : (
                        <>
                          <Plus size={11} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
