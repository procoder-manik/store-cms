export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-[10px] bg-fill" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-[18px] bg-fill" />)}</div>
      <div className="mt-5 h-72 rounded-[20px] bg-fill" />
    </div>
  );
}
