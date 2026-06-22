/**
 * Barrel exports da camada de ingestão.
 *
 * Cada adapter importa daqui:
 *   import { HttpClient, getBucket, SyncLogger, upsertSource } from "@/lib/ingest";
 *   import type { ExternalSource, ExternalNovel, ExternalChapter } from "@/lib/ingest";
 */

export * from "./types";
export { HttpClient, HttpError } from "./http-client";
export type { HttpClientConfig, HttpRequestOptions, HttpResponse } from "./http-client";
export { TokenBucket, getBucket, listBuckets } from "./rate-limiter";
export type { TokenBucketConfig } from "./rate-limiter";
export { SyncLogger, upsertSource } from "./logger";
export type { SyncLoggerOptions, SyncRunSummary, SyncMode, SyncStatus, UpsertSourceOptions } from "./logger";
export { upsertNovel } from "./upserter";
export type { UpsertResult } from "./upserter";
export { VndbAdapter } from "./adapters/vndb";
export { JikanAdapter } from "./adapters/jikan";
export { MangaDexAdapter } from "./adapters/mangadex";
export { AniListAdapter } from "./adapters/anilist";
// RoyalRoadAdapter mantido mas não registrado (API descontinuada em 2024)
export { RoyalRoadAdapter } from "./adapters/royalroad";
export { runSync } from "./run-sync";
export type { RunSyncOptions, RunSyncResult } from "./run-sync";
export { getAdapter, listAdapterNames, isAdapterRegistered } from "./adapters";
