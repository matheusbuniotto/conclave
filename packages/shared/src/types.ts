import { z } from "zod";

export const UserTypeSchema = z.enum(["human", "agent"]);
export type UserType = z.infer<typeof UserTypeSchema>;

export const ChannelTypeSchema = z.enum(["public", "private", "dm", "group_dm"]);
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

export const WorkspaceRoleSchema = z.enum(["owner", "admin", "member", "guest"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const PresenceStatusSchema = z.enum(["online", "away", "busy", "offline"]);
export type PresenceStatus = z.infer<typeof PresenceStatusSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
  userType: UserTypeSchema.default("human"),
  createdAt: z.string().or(z.date()),
});
export type User = z.infer<typeof UserSchema>;

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  iconUrl: z.string().url().nullable().optional(),
  ownerId: z.string().uuid(),
  createdAt: z.string().or(z.date()),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const ChannelSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  topic: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  type: ChannelTypeSchema.default("public"),
  createdById: z.string().uuid(),
  createdAt: z.string().or(z.date()),
});
export type Channel = z.infer<typeof ChannelSchema>;

export const ReactionSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  userId: z.string().uuid(),
  emoji: z.string(),
  createdAt: z.string().or(z.date()),
});
export type Reaction = z.infer<typeof ReactionSchema>;

export const MessageAttachmentSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  fileUrl: z.string().url(),
});
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  channelId: z.string().uuid(),
  senderId: z.string().uuid(),
  parentMessageId: z.string().uuid().nullable().optional(),
  content: z.string(),
  metadata: z.record(z.unknown()).default({}),
  replyCount: z.number().default(0),
  lastReplyAt: z.string().or(z.date()).nullable().optional(),
  isEdited: z.boolean().default(false),
  deletedAt: z.string().or(z.date()).nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Message = z.infer<typeof MessageSchema>;
