export default function FeedLoading() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-500/40 border-t-fuchsia-400" />
        <p className="text-sm text-zinc-500">Preparando seu feed...</p>
      </div>
    </div>
  );
}
