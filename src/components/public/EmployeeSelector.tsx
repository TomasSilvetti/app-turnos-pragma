"use client";

type Employee = {
  id: string;
  name: string;
};

type Props = {
  employees: Employee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function EmployeeSelector({ employees, selectedId, onSelect }: Props) {
  if (employees.length <= 1) return null;

  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-3">
      <p className="font-body text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
        Seleccioná un profesional
      </p>
      <div className="flex flex-col gap-2">
        {employees.map((emp) => {
          const isSelected = selectedId === emp.id;
          return (
            <button
              key={emp.id}
              type="button"
              onClick={() => onSelect(emp.id)}
              className={[
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors text-left",
                isSelected
                  ? "bg-[var(--brand-color)] text-white"
                  : "bg-[#F4F5F7] dark:bg-[#0f172a] text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#E8E9EB] dark:hover:bg-[#1e293b]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-7 w-7 rounded-full flex items-center justify-center font-body text-xs font-semibold uppercase shrink-0",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-[var(--brand-color)]/10 text-[var(--brand-color)]",
                ].join(" ")}
              >
                {emp.name.charAt(0)}
              </span>
              <span className="font-body font-medium">{emp.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
