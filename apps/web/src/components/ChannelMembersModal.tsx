import React from "react";
import { X, Bot, Plus, Check, Trash2, Hash } from "lucide-react";
import type { ChannelItem, MemberItem, BotItem } from "../api";
import { BotFace } from "./BotFace";

interface ChannelMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChannelItem | null;
  channelMembers: MemberItem[];
  allBots: BotItem[];
  onAddBotToChannel: (botUserId: string) => Promise<void>;
  onRemoveBotFromChannel: (botUserId: string) => Promise<void>;
  onOpenCreateBotModal: () => void;
}

export const ChannelMembersModal: React.FC<ChannelMembersModalProps> = ({
  isOpen,
  onClose,
  channel,
  channelMembers,
  allBots,
  onAddBotToChannel,
  onRemoveBotFromChannel,
  onOpenCreateBotModal,
}) => {
  if (!isOpen || !channel) return null;

  const channelMemberIds = new Set(channelMembers.map((m) => m.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-2">
            <Hash size={15} className="text-zinc-400" />
            <h2 className="font-semibold text-zinc-900 text-[13.5px] tracking-tight">
              #{channel.name} • Members & Bots
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200/60 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Bots Management Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium tracking-wide uppercase text-zinc-500">
                Workspace Bots in #{channel.name}
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenCreateBotModal();
                }}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-800 hover:text-black font-medium transition-colors"
              >
                <Plus size={12} />
                <span>New Bot</span>
              </button>
            </div>

            <div className="space-y-1.5 border border-zinc-200/80 rounded-xl p-1.5 bg-zinc-50/40">
              {allBots.length === 0 ? (
                <div className="p-3 text-center text-zinc-400 text-xs">
                  No bots created yet. Click "New Bot" to create one!
                </div>
              ) : (
                allBots.map((bot) => {
                  const isInChannel = channelMemberIds.has(bot.userId);

                  return (
                    <div
                      key={bot.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-150 hover:border-zinc-200 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <BotFace look={bot.avatarLabel || "1.7.0.0"} size={26} />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-900 text-[12.5px] truncate">
                              {bot.name}
                            </span>
                            <span className="text-[9.5px] bg-zinc-100 text-zinc-600 px-1 rounded border border-zinc-200/80 uppercase font-mono">
                              {bot.engine}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-zinc-400 truncate">
                            @{bot.handle} {bot.description ? `• ${bot.description}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0 ml-2">
                        {isInChannel ? (
                          <button
                            onClick={() => onRemoveBotFromChannel(bot.userId)}
                            className="px-2 py-1 rounded-md text-[11px] font-medium border border-zinc-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-zinc-600 transition-colors flex items-center gap-1"
                            title="Remove bot from channel"
                          >
                            <Check size={11} className="text-emerald-500" />
                            <span>In Channel</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onAddBotToChannel(bot.userId)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition-colors shadow-2xs flex items-center gap-1"
                          >
                            <Plus size={11} />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Human Members Section */}
          <div>
            <div className="text-[11px] font-medium tracking-wide uppercase text-zinc-500 mb-2">
              Channel Members ({channelMembers.length})
            </div>
            <div className="border border-zinc-200/80 rounded-xl divide-y divide-zinc-100 max-h-44 overflow-y-auto bg-white">
              {channelMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-5 h-5 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] font-medium text-zinc-600 flex-shrink-0">
                      {member.displayName.slice(0, 1)}
                    </div>
                    <span className="text-[12px] text-zinc-800 truncate">
                      {member.displayName}
                    </span>
                    {member.userType === "agent" && (
                      <span className="text-[9px] bg-zinc-100 text-zinc-500 px-1 rounded uppercase font-mono">
                        Bot
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 capitalize">
                    {member.role || "Member"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
