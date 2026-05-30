"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useHomeLogin } from "@/components/layout/home-login-context";
import { PRODUCT_NAME } from "@/lib/branding";

/** Temporary instructor portal entry until real auth maps the logged-in user. */
const INSTRUCTOR_LOGIN_PATH = "/instructor/marc-barton";

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
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:text-dojo-red sm:text-base"
        >
          {PRODUCT_NAME}
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:border-dojo-red/60 hover:text-dojo-red"
          >
            Login
            <span aria-hidden="true" className="text-xs text-neutral-400">
              {isOpen ? "▲" : "▼"}
            </span>
          </button>

          {isOpen ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-xl"
            >
              <span
                role="menuitem"
                aria-disabled="true"
                className="block cursor-not-allowed px-4 py-2.5 text-sm text-neutral-500"
              >
                Student Login
                <span className="mt-0.5 block text-xs text-neutral-600">
                  Coming soon
                </span>
              </span>
              <Link
                href={INSTRUCTOR_LOGIN_PATH}
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 hover:text-dojo-red"
              >
                Instructor Login
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
