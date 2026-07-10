export type TomoMusicTrack = {
  id: string;
  title: string;
  artist: string;
  description: string;
  mood: string;
  genre: string;
  duration_seconds: number;
  file_url: string;
  cover_url: string | null;
  source_url: string;
  license_name: string;
  license_url: string;
  attribution_required: boolean;
  attribution_text: string;
  source: string | null;
  downloaded_at: string | null;
  local_file: string | null;
  bytes: number;
  is_active: boolean;
  play_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  liked?: boolean;
  favorited?: boolean;
};

export type TomoMusicPlaylist = {
  id: string;
  slug: string;
  title: string;
  description: string;
  mood: string;
  cover_url: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  track_ids: string[];
};

export type TomoMusicPayload = {
  tracks: TomoMusicTrack[];
  playlists: TomoMusicPlaylist[];
  moods: string[];
  stats: {
    totalTracks: number;
    totalSeconds: number;
    totalBytes: number;
    creditsRequired: number;
  };
  subscription?: {
    hasSubscription: boolean;
    freeLimit: number;
    totalTracks: number;
  };
};
