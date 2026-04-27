"use client";

import CardSwap, { Card } from "./CardSwap";

interface Props {
  swapTrigger: number;
}

// Card order matches question order:
// 0 → "¿Huecos en la agenda?"        → Lista de espera
// 1 → "¿Esperas entre turnos?"        → Agenda del día
// 2 → "¿Cancelaciones a último momento?" → Recordatorio automático

export function HeroCards({ swapTrigger }: Props) {
  return (
    <CardSwap
      width={380}
      height={260}
      cardDistance={50}
      verticalDistance={60}
      pauseOnHover
      skewAmount={4}
      easing="elastic"
      swapTrigger={swapTrigger}
    >
      {/* Card 0 — responde "¿Huecos en la agenda?" */}
      <Card className="p-7 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Lista de espera
          </p>
          <div className="space-y-3">
            {[
              { name: "Carlos M.", time: "Mar 9:00", ready: true },
              { name: "Sofía R.", time: "Mar 11:30", ready: false },
              { name: "Diego P.", time: "Mié 10:00", ready: false },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-medium text-slate-300">
                    {item.name[0]}
                  </div>
                  <span className="text-sm text-slate-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{item.time}</span>
                  {item.ready && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black text-white">
                      Notificado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Cuando hay un hueco, se notifica automáticamente.
        </p>
      </Card>

      {/* Card 1 — responde "¿Esperas entre turnos?" */}
      <Card className="p-7 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Agenda del día
          </p>
          <div className="space-y-2.5">
            {[
              { time: "09:00", name: "Ana Torres", status: "confirmed" },
              { time: "10:30", name: "Juan Pérez", status: "confirmed" },
              { time: "12:00", name: "—", status: "free" },
              { time: "15:00", name: "María López", status: "confirmed" },
            ].map((item) => (
              <div key={item.time} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-10 shrink-0 font-mono">{item.time}</span>
                <span className={`text-sm flex-1 ${item.status === "free" ? "text-slate-600" : "text-slate-200"}`}>
                  {item.name}
                </span>
                {item.status === "confirmed" && (
                  <span className="text-[10px] text-gray-400">✓ confirmado</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Sin huecos entre turnos. Todo coordinado.
        </p>
      </Card>

      {/* Card 2 — responde "¿Cancelaciones a último momento?" */}
      <Card className="p-7 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Recordatorio automático
          </p>
          <div className="rounded-lg bg-white/5 border border-white/10 p-3.5 text-sm text-slate-300 leading-relaxed">
            Hola <span className="font-medium">Martina</span>, te recordamos tu turno
            con <span className="font-medium">Lic. González</span> mañana a las{" "}
            <span className="font-medium">10:00 hs</span>. ¿Confirmás asistencia?
          </div>
          <div className="flex items-center gap-2.5 mt-3.5">
            <button className="text-xs font-medium px-3.5 py-1.5 rounded-md bg-black text-white">
              Confirmar
            </button>
            <button className="text-xs font-medium px-3.5 py-1.5 rounded-md border border-white/20 text-slate-400">
              Reprogramar
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Se envía 24 hs antes. Sin que tengas que hacer nada.
        </p>
      </Card>
    </CardSwap>
  );
}
