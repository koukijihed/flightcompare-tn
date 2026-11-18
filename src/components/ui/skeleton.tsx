import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function OfferSkeleton() {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}
