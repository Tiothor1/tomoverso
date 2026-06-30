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
import type { FeedPageResult, FeedTargetType, FeedWorkType } from "@/lib/feed/types";

function isTargetType(value: string): value is FeedTargetType {
  return value === "post" || value === "novel" || value === "manga";
}

function fallbackFeedPage(input?: { sessionId?: string }): FeedPageResult {
  return { items: [], nextCursor: null, sessionId: input?.sessionId || "feed-fallback" };
}

function logFeedActionError(action: string, error: unknown) {
  console.error(`[feed] ${action} failed`, error);
}

function feedUnavailable() {
  return { ok: false, error: "feed_unavailable" };
}

export async function getFeedPageAction(input?: { cursor?: number; limit?: number; sessionId?: string }) {
  try {
    const db = getDb();
    const user = await getCurrentUser().catch(() => null);
    return getFeedPage(db, user, input);
  } catch (error) {
    logFeedActionError("getFeedPageAction", error);
    return fallbackFeedPage(input);
  }
}

export async function getFeedWorkOptionsAction() {
  try {
    return getFeedWorkOptions(getDb());
  } catch (error) {
    logFeedActionError("getFeedWorkOptionsAction", error);
    return [];
  }
}

export async function toggleFeedLikeAction(targetType: FeedTargetType, targetId: string) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) return { ok: false, error: "login_required" };
    if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
    return { ok: true, ...toggleLike(getDb(), user.id, targetType, targetId) };
  } catch (error) {
    logFeedActionError("toggleFeedLikeAction", error);
    return feedUnavailable();
  }
}

export async function toggleFeedSaveAction(targetType: FeedTargetType, targetId: string, work?: { type?: FeedWorkType | null; id?: string | null }) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) return { ok: false, error: "login_required" };
    if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
    return { ok: true, ...toggleSave(getDb(), user.id, targetType, targetId, work) };
  } catch (error) {
    logFeedActionError("toggleFeedSaveAction", error);
    return feedUnavailable();
  }
}

export async function toggleFeedFollowAction(followingId: string) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) return { ok: false, error: "login_required" };
    if (!followingId) return { ok: false, error: "invalid_user" };
    return { ok: true, ...toggleFollow(getDb(), user.id, followingId) };
  } catch (error) {
    logFeedActionError("toggleFeedFollowAction", error);
    return feedUnavailable();
  }
}

export async function createFeedPostAction(input: { title?: string; body: string; workType?: FeedWorkType | ""; workId?: string; type?: string }) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) return { ok: false, error: "login_required" };
    return createFeedPost(getDb(), user.id, input);
  } catch (error) {
    logFeedActionError("createFeedPostAction", error);
    return feedUnavailable();
  }
}

export async function getFeedCommentsAction(targetType: FeedTargetType, targetId: string) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!isTargetType(targetType) || !targetId) return [];
    return getComments(getDb(), targetType, targetId, user?.id || null);
  } catch (error) {
    logFeedActionError("getFeedCommentsAction", error);
    return [];
  }
}

export async function createFeedCommentAction(targetType: FeedTargetType, targetId: string, body: string) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) return { ok: false, error: "login_required" };
    if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
    return createComment(getDb(), user.id, targetType, targetId, body);
  } catch (error) {
    logFeedActionError("createFeedCommentAction", error);
    return feedUnavailable();
  }
}

export async function repostFeedItemAction(targetType: FeedTargetType, targetId: string, text?: string) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) return { ok: false, error: "login_required" };
    if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
    return repostItem(getDb(), user.id, targetType, targetId, text);
  } catch (error) {
    logFeedActionError("repostFeedItemAction", error);
    return feedUnavailable();
  }
}

export async function markFeedItemAction(targetType: FeedTargetType, targetId: string, interaction: "hide" | "not_interested" | "share" | "open_work" | "open_chapter", metadata?: Record<string, unknown>) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) return { ok: false, error: "login_required" };
    if (!isTargetType(targetType) || !targetId) return { ok: false, error: "invalid_target" };
    return markFeedItem(getDb(), user.id, targetType, targetId, interaction, metadata);
  } catch (error) {
    logFeedActionError("markFeedItemAction", error);
    return feedUnavailable();
  }
}

export async function registerFeedImpressionAction(input: { itemType: string; itemId: string; position?: number; sessionId?: string }) {
  try {
    const user = await getCurrentUser().catch(() => null);
    return registerImpression(getDb(), user?.id || null, input);
  } catch (error) {
    logFeedActionError("registerFeedImpressionAction", error);
    return { ok: false, error: "feed_unavailable" };
  }
}
