import { z } from "zod";
import { MessageSchema, ReactionSchema, PresenceStatusSchema } from "./types";

export const ServerToClientEvents = {
  MESSAGE_CREATED: "message.created",
  MESSAGE_UPDATED: "message.updated",
  MESSAGE_DELETED: "message.deleted",
  REACTION_ADDED: "reaction.added",
  REACTION_REMOVED: "reaction.removed",
  TYPING_STARTED: "typing.started",
  TYPING_STOPPED: "typing.stopped",
  PRESENCE_UPDATED: "presence.updated",
  CHANNEL_JOINED: "channel.joined",
  CHANNEL_LEFT: "channel.left",
} as const;

export const ClientToServerEvents = {
  JOIN_CHANNEL: "channel.join",
  LEAVE_CHANNEL: "channel.leave",
  SEND_MESSAGE: "message.send",
  EDIT_MESSAGE: "message.edit",
  DELETE_MESSAGE: "message.delete",
  ADD_REACTION: "reaction.add",
  REMOVE_REACTION: "reaction.remove",
  SET_TYPING: "typing.set",
  SET_PRESENCE: "presence.set",
} as const;

export const TypingEventPayloadSchema = z.object({
  channelId: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  isTyping: z.boolean(),
});
export type TypingEventPayload = z.infer<typeof TypingEventPayloadSchema>;

export const PresenceEventPayloadSchema = z.object({
  userId: z.string().uuid(),
  status: PresenceStatusSchema,
  statusText: z.string().optional(),
});
export type PresenceEventPayload = z.infer<typeof PresenceEventPayloadSchema>;
