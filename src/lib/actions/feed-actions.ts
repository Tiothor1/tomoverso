"use server";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  createComment,
  createFeedPost,
  getComments,
  getFeedPage,
  getFeedWorkOptions,
  markFeedItem,
  registerImpression,
  repostItem,
  toggleFollow,
  toggleLike,
  toggleSave,
} from "@/lib/feed/service";
import type { FeedTargetType, FeedWorkType } from "@/lib/feed/types";

function isTargetType(value: string): value is FeedTargetType {
  return value === "post" || value === "novel" || value === "manga";
}

export async function getFeedPageAction(input?: { cursor?: number; limit?: number; sessionId?: string }) {
  const db = getDb();
  const user = await getCurrentUser().catch(() => null);
  return getFeedPage(db, user, input);
}

export async function getFeedWorkOptionsAction() {
  return getFeedWorkOptions(getDb());
}

export async function toggleFeedLikeAction(targetType: FeedTargetType, targetId: string) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false, error: "login_required" };
  if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
  return { ok: true, ...toggleLike(getDb(), user.id, targetType, targetId) };
}

export async function toggleFeedSaveAction(targetType: FeedTargetType, targetId: string, work?: { type?: FeedWorkType | null; id?: string | null }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false, error: "login_required" };
  if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
  return { ok: true, ...toggleSave(getDb(), user.id, targetType, targetId, work) };
}

export async function toggleFeedFollowAction(followingId: string) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false, error: "login_required" };
  if (!followingId) return { ok: false, error: "invalid_user" };
  return { ok: true, ...toggleFollow(getDb(), user.id, followingId) };
}

export async function createFeedPostAction(input: { title?: string; body: string; workType?: FeedWorkType | ""; workId?: string; type?: string }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false, error: "login_required" };
  return createFeedPost(getDb(), user.id, input);
}

export async function getFeedCommentsAction(targetType: FeedTargetType, targetId: string) {
  const user = await getCurrentUser().catch(() => null);
  if (!isTargetType(targetType) || !targetId) return [];
  return getComments(getDb(), targetType, targetId, user?.id || null);
}

export async function createFeedCommentAction(targetType: FeedTargetType, targetId: string, body: string) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false, error: "login_required" };
  if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
  return createComment(getDb(), user.id, targetType, targetId, body);
}

export async function repostFeedItemAction(targetType: FeedTargetType, targetId: string, text?: string) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false, error: "login_required" };
  if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
  return repostItem(getDb(), user.id, targetType, targetId, text);
}

export async function markFeedItemAction(targetType: FeedTargetType, targetId: string, interaction: "hide" | "not_interested" | "share" | "open_work" | "open_chapter", metadata?: Record<string, unknown>) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { ok: false, error: "login_required" };
  if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
  return markFeedItem(getDb(), user.id, targetType, targetId, interaction, metadata);
}

export async function registerFeedImpressionAction(input: { itemType: string; itemId: string; position?: number; sessionId?: string }) {
  const user = await getCurrentUser().catch(() => null);
  return registerImpression(getDb(), user?.id || null, input);
}
