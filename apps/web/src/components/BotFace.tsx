import React, { useMemo, useEffect } from "react";
import {
  type BotConfig,
  DEFAULT_BOT,
  decodeBot,
  renderBot,
  attachMouseFollow,
} from "./bot-avatar";

interface BotFaceProps {
  look?: string | BotConfig | null;
  size?: number;
  className?: string;
}

let mouseFollowActive = false;
let cleanupMouseFollow: (() => void) | null = null;

export const BotFace: React.FC<BotFaceProps> = ({
  look,
  size = 32,
  className = "",
}) => {
  useEffect(() => {
    if (!mouseFollowActive && typeof window !== "undefined") {
      mouseFollowActive = true;
      cleanupMouseFollow = attachMouseFollow(document);
    }
  }, []);

  const config: BotConfig = useMemo(() => {
    if (!look) return DEFAULT_BOT;
    if (typeof look === "object") return look;
    return decodeBot(look);
  }, [look]);

  const svgHtml = useMemo(() => {
    return renderBot(config, size);
  }, [config, size]);

  return (
    <div
      className={`inline-flex items-center justify-center overflow-visible select-none transition-transform ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
};
