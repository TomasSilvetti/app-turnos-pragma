export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center px-4">
      <div className="rounded-lg bg-white border border-[color:var(--color-border)] p-5 w-full max-w-md text-center">
        <h1 className="font-heading text-2xl text-[color:var(--color-primary)] mb-2">
          Panel principal
        </h1>
        <p className="font-body text-[color:var(--foreground)] text-sm">
          Bienvenido a tu panel de gestión.
        </p>
      </div>
    </div>
  );
}
