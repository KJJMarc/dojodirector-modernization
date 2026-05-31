"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { HomeLoginMenu } from "@/components/layout/home-login-menu";
import { useHomeLogin } from "@/components/layout/home-login-context";
export function HomeHeader() {
  const { isOpen, setIsOpen } = useHomeLogin();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, setIsOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:text-dojo-red sm:text-base"
        >
          <span className="text-white">DOJO </span>
          <span className="text-dojo-red">DIRECTOR</span>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-dojo-red/50 hover:bg-neutral-800"
          >
            Login
            <span aria-hidden="true" className="text-xs text-neutral-400">
              {isOpen ? "▲" : "▼"}
            </span>
          </button>

          {isOpen ? <HomeLoginMenu onNavigate={() => setIsOpen(false)} /> : null}
        </div>
      </div>
    </header>
  );
}
