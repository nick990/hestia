import { Skeleton } from "@/components/ui/skeleton";

const cardHeights = ["h-36", "h-52", "h-44", "h-64", "h-40", "h-48"];

export default function NotesLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8"
      aria-label="Caricamento note"
      aria-busy="true"
    >
      <Skeleton className="h-7 w-24" />
      <Skeleton className="mx-auto mt-6 h-12 w-full max-w-2xl rounded-xl" />
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {cardHeights.map((height, index) => (
            <Skeleton
              key={index}
              className={`mb-3 inline-block w-full break-inside-avoid rounded-xl ${height}`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
