export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-3">
          <div className="h-10 w-72 animate-pulse rounded bg-muted" />
          <div className="h-5 w-96 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-11 animate-pulse rounded bg-muted/80" />
            <div className="h-11 animate-pulse rounded bg-muted/80" />
            <div className="h-11 animate-pulse rounded bg-muted/80" />
          </div>
          <div className="mt-4 h-[520px] animate-pulse rounded bg-muted/70" />
        </div>
      </div>
    </div>
  );
}
