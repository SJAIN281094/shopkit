export function StoreMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-zinc-50 px-6 text-center text-zinc-900">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-zinc-600">{body}</p>
    </main>
  );
}
