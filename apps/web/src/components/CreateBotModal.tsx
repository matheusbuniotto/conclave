import React, { useState } from "react";
import { X, Sparkles, Bot, Hash, Check } from "lucide-react";
import type { ChannelItem } from "../api";

interface CreateBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ChannelItem[];
  currentChannelId?: string | null;
  onCreateBot: (data: {
    name: string;
    handle: string;
    description: string;
    systemPrompt: string;
    engine: "agy" | "claude";
    channelIds: string[];
  }) => Promise<void>;
}

export const CreateBotModal: React.FC<CreateBotModalProps> = ({
  isOpen,
  onClose,
  channels,
  currentChannelId,
  onCreateBot,
}) => {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [engine, setEngine] = useState<"agy" | "claude">("agy");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    currentChannelId ? [currentChannelId] : channels[0] ? [channels[0].id] : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate clean handle if user hasn't typed a custom handle
    const suggested = val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    setHandle(suggested);
  };

  const toggleChannel = (chId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanHandle = (handle.trim() || name.trim())
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    setIsSubmitting(true);
    try {
      await onCreateBot({
        name: name.trim(),
        handle: cleanHandle,
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        engine,
        channelIds: selectedChannels,
      });
      // Reset form
      setName("");
      setHandle("");
      setDescription("");
      setSystemPrompt("");
      onClose();
    } catch (err) {
      console.error("Failed to create bot", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="h-13 px-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
              <Sparkles size={13} />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 text-[13.5px] tracking-tight">
                Create New Bot
              </h2>
              <p className="text-[11px] text-zinc-400 font-normal">
                Dedicated sandbox compute agent for your workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200/60 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Bot Name & Handle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-zinc-700 mb-1">
                Bot Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Data Analyst"
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200/90 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-zinc-700 mb-1">
                Mention Handle
              </label>
              <div className="flex items-center px-2.5 py-1.5 rounded-lg border border-zinc-200/90 bg-zinc-50/50 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100">
                <span className="text-zinc-400 mr-0.5">@</span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="data-analyst"
                  className="w-full bg-transparent border-0 p-0 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Engine Selector */}
          <div>
            <label className="block text-[11.5px] font-medium text-zinc-700 mb-1">
              Agent Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEngine("agy")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  engine === "agy"
                    ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900/10"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${engine === "agy" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}>
                  {engine === "agy" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 text-[12px]">Google agy</div>
                  <div className="text-[10px] text-zinc-500 font-normal">Google Subscription</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEngine("claude")}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  engine === "claude"
                    ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900/10"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${engine === "claude" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}>
                  {engine === "claude" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 text-[12px]">Claude Code</div>
                  <div className="text-[10px] text-zinc-500 font-normal">Anthropic CLI / BYOK</div>
                </div>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11.5px] font-medium text-zinc-700 mb-1">
              Short Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Builds dashboards and queries databases"
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200/90 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition-all"
            />
          </div>

          {/* System Prompt / Instructions */}
          <div>
            <label className="block text-[11.5px] font-medium text-zinc-700 mb-1">
              System Instructions <span className="text-zinc-400 font-normal">(custom persona or rules)</span>
            </label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. You are a senior database engineer. Always write clean SQL and generate interactive visualization widgets."
              className="w-full px-3 py-2 rounded-lg border border-zinc-200/90 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none resize-none leading-relaxed transition-all"
            />
          </div>

          {/* Channel Assignment Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11.5px] font-medium text-zinc-700">
                Add to Channels
              </label>
              <span className="text-[10.5px] text-zinc-400">
                {selectedChannels.length} of {channels.length} selected
              </span>
            </div>
            <div className="border border-zinc-200/90 rounded-xl divide-y divide-zinc-100 max-h-36 overflow-y-auto bg-zinc-50/40">
              {channels.map((ch) => {
                const isChecked = selectedChannels.includes(ch.id);
                return (
                  <label
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-zinc-100/70 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Hash size={13} className="text-zinc-400" />
                      <span className="font-medium text-zinc-800 text-[12px]">{ch.name}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-zinc-900 border-zinc-900 text-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check size={11} />}
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1">
              Bots only respond in channels where they have been added. You can change this anytime.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Bot size={13} />
                  <span>Create Bot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
