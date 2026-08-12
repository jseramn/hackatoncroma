"use client";

import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

// Ruled header: full-height cells separated by hairlines, part of the page
// grid rather than a floating bar.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-stretch justify-between border-x border-line">
        <a
          className="flex items-center gap-3 border-r border-line px-4 transition-colors hover:bg-secondary/40"
          href="https://usecroma.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          <Image
            alt="Croma"
            className="h-4.5 w-auto dark:invert"
            height={24}
            priority
            src="/croma_brand_black.svg"
            width={150}
          />
          <span className="eyebrow-sm mt-0.5 hidden sm:block">
            Chat&nbsp;Template
          </span>
        </a>
        <div className="flex items-stretch">
          <a
            className="hidden items-center border-l border-line px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground md:flex"
            href="https://docs.usecroma.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Docs
          </a>
          <a
            className="flex items-center border-l border-line bg-foreground px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-background transition-colors hover:bg-foreground/85"
            href="https://platform.usecroma.com/sign-up"
            rel="noopener noreferrer"
            target="_blank"
          >
            Get&nbsp;API&nbsp;key
          </a>
          <div className="flex items-center border-l border-line px-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
