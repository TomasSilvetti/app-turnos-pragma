"use client";

import { useEffect, useRef, useState } from "react";

const QUESTIONS = [
  "¿Huecos en la agenda?",
  "¿Esperas entre turnos?",
  "¿Cancelaciones a último momento?",
];

const FADE_MS = 300;

interface Props {
  index: number;
  onGoTo: (i: number) => void;
}

export function HeroCarousel({ index, onGoTo }: Props) {
  const [visible, setVisible] = useState(true);
  const prevIndex = useRef(index);

  useEffect(() => {
    if (prevIndex.current === index) return;
    prevIndex.current = index;
    setVisible(false);
    const t = setTimeout(() => setVisible(true), FADE_MS);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div>
      <p
        className="text-[28px] font-medium leading-snug text-white transition-opacity"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      >
        {QUESTIONS[index]}
      </p>
      <div className="mt-3 flex items-center gap-1.5">
        {QUESTIONS.map((_, i) => (
          <button
            key={i}
            aria-label={`Pregunta ${i + 1}`}
            onClick={() => onGoTo(i)}
            className="h-1.5 w-1.5 rounded-full transition-colors"
            style={{ backgroundColor: i === index ? "#ffffff" : "#4b5563" }}
          />
        ))}
      </div>
    </div>
  );
}
