export type FeedTargetType = "post" | "novel" | "manga";
export type FeedItemKind = "recommendation" | "post" | "trend" | "update" | "continue";
export type FeedWorkType = "novel" | "manga";

export interface FeedUserBadge {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin" | "author";
  isFollowed: boolean;
}

export interface FeedWorkRef {
  id: string;
  slug: string;
  title: string;
  type: FeedWorkType;
  href: string;
  readHref: string;
  coverUrl: string | null;
  synopsis: string;
  authorName: string | null;
  authorId: string | null;
  genres: string[];
  tags: string[];
  status: string;
  chapterCount: number;
  views: number;
  rating: number | null;
  latestChapterTitle?: string | null;
  latestChapterHref?: string | null;
}

export interface FeedCounts {
  likes: number;
  comments: number;
  favorites: number;
  reposts: number;
  shares: number;
}

export interface FeedState {
  liked: boolean;
  saved: boolean;
  hidden: boolean;
  notInterested: boolean;
}

export interface FeedItem {
  id: string;
  kind: FeedItemKind;
  targetType: FeedTargetType;
  targetId: string;
  title: string;
  body: string;
  reason: string;
  score: number;
  createdAt: string;
  user: FeedUserBadge | null;
  work: FeedWorkRef | null;
  postId?: string | null;
  mediaUrl?: string | null;
  mediaKind?: "cover" | "page" | "post" | null;
  mediaCaption?: string | null;
  actionLabel: string;
  actionHref: string;
  badges: string[];
  counts: FeedCounts;
  state: FeedState;
}

export interface FeedPageResult {
  items: FeedItem[];
  nextCursor: number | null;
  sessionId: string;
}

export interface FeedCommentItem {
  id: string;
  body: string;
  createdAt: string;
  user: FeedUserBadge;
}

export interface FeedWorkOption {
  id: string;
  type: FeedWorkType;
  title: string;
  label: string;
}
