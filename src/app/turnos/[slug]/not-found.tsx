export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#F4F5F7] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white border border-[#E0E0DB] p-8 text-center">
        <p className="font-small text-5xl text-[#E0E0DB] mb-4">404</p>
        <h1 className="font-heading text-xl text-[#2A2829] mb-2">
          Negocio no encontrado
        </h1>
        <p className="text-sm text-slate-500">
          El link que usaste no corresponde a ningún negocio registrado.
        </p>
      </div>
    </main>
  );
}
