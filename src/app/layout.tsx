import type { Metadata } from "next"
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google"
import Link from "next/link"
import { WalletButton } from "@/components/WalletButton"
import { WalletProvider } from "@/lib/wallet"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Takedown Ledger",
  description: "A public record of content takedown demands that no operator can quietly erase. Built on Arkiv.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <WalletProvider>
          <header className="border-b border-[var(--line)]">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="font-serif text-xl font-semibold">Takedown Ledger</span>
                <span className="hidden text-xs text-[var(--muted)] sm:inline">censorship, on the record</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/" className="hover:text-[var(--accent)]">Ledger</Link>
                <Link href="/file" className="hover:text-[var(--accent)]">File a notice</Link>
                <Link href="/about" className="hover:text-[var(--accent)]">How it works</Link>
                <WalletButton />
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
          <footer className="border-t border-[var(--line)] px-4 py-4 text-center text-xs text-[var(--muted)]">
            All demo notices are <strong>synthetic</strong>. Data lives on Arkiv&apos;s Tiramisu testnet — this site is
            only one reader of it. MIT licensed.
          </footer>
        </WalletProvider>
      </body>
    </html>
  )
}
