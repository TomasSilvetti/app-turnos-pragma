"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HeroCarousel } from "./HeroCarousel";
import { HeroCards } from "./HeroCards";
import { Plasma } from "./Plasma";

const INTERVAL_MS = 3000;
const TOTAL = 3;

export function HeroSection() {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % TOTAL);
    }, INTERVAL_MS);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function goTo(i: number) {
    setIndex(i);
    startTimer();
  }

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startTimer();
        } else {
          stopTimer();
        }
      },
      { threshold: 0 }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
      stopTimer();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative flex min-h-[calc(100vh-57px)] items-center overflow-hidden">
      {/* Plasma background */}
      <Plasma
        speed={0.5}
        color1="#0a1628"
        color2="#0d1f3c"
        color3="#1a3a6b"
        color4="#0f2a50"
      />
      {/* Subtle dark overlay so text stays readable */}
      <div className="absolute inset-0 bg-[#0a1628]/50" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left */}
          <div>
            <HeroCarousel index={index} onGoTo={goTo} />

            {/* Cards — mobile only, between carousel and title */}
            <div className="relative mt-8 h-[370px] lg:hidden">
              <HeroCards swapTrigger={index} mobileSize />
            </div>

            <h1 className="mt-8 text-[36px] font-medium leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px] md:text-[44px]">
              Tu agenda siempre llena,
              <br />
              sin perseguir a nadie.
            </h1>

            <p className="mt-5 max-w-[480px] text-base leading-[1.6] text-slate-400">
              Pragma Turnos gestiona los recordatorios, las cancelaciones y la
              lista de espera por vos. Llegá y atendé.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-2.5 text-sm font-medium text-[#0f1623] transition-colors duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Empezar gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Quiero una demo personalizada
              </Link>
            </div>
          </div>

          {/* Right — CardSwap, desktop only */}
          <div className="relative hidden h-[560px] lg:block">
            <HeroCards swapTrigger={index} />
          </div>
        </div>
      </div>
    </section>
  );
}

