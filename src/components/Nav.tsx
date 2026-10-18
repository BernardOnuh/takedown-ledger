"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"

const LINKS = [
  { href: "/", label: "Ledger", match: (p: string) => p === "/" || p.startsWith("/notice") || p.startsWith("/filer") },
  { href: "/file", label: "File a notice", match: (p: string) => p.startsWith("/file") && !p.startsWith("/filer") },
  { href: "/about", label: "How it works", match: (p: string) => p.startsWith("/about") },
]

/** usePathname suspends on dynamic routes under Cache Components, so the fallback renders unhighlighted tabs. */
export function Nav() {
  return (
    <Suspense fallback={<NavLinks path="" />}>
      <ActiveNav />
    </Suspense>
  )
}

function ActiveNav() {
  return <NavLinks path={usePathname()} />
}

/** Tabs on mobile (full-width row), plain links on desktop. */
function NavLinks({ path }: { path: string }) {
  return (
    <nav className="-mx-4 flex border-t border-[var(--line)] text-sm sm:mx-0 sm:gap-1 sm:border-0">
      {LINKS.map((l) => {
        const active = l.match(path)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 border-b-2 px-2 py-2.5 text-center sm:flex-none sm:rounded-md sm:border-0 sm:px-3 sm:py-1.5 ${
              active
                ? "border-[var(--accent)] font-semibold text-[var(--ink)] sm:bg-[var(--card)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
