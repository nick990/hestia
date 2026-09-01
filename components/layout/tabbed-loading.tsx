import { Skeleton } from "@/components/ui/skeleton";

export function TabbedLoadingSkeleton() {
  return (
    <div
      className="pointer-events-none flex flex-1 select-none flex-col gap-4 p-6"
      role="status"
      aria-label="Caricamento in corso"
      aria-busy="true"
      inert
    >
      <div className="flex justify-center">
        <Skeleton className="h-7 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-2/3 rounded-lg" />
      </div>
    </div>
  );
}
