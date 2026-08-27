export function HomeVistaError({ message }: { message: string }) {
  return (
    <div className="px-6 py-8">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
