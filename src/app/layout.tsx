import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google"
import Link from "next/link"
import { LogoMark } from "@/components/Logo"
import { Nav } from "@/components/Nav"
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#141310" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <WalletProvider>
          <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 px-4 pt-3 sm:flex-nowrap sm:py-3">
              <Link href="/" className="flex items-center gap-2">
                <LogoMark />
                <span className="font-serif text-xl font-semibold">Takedown Ledger</span>
                <span className="hidden text-xs text-[var(--muted)] lg:inline">censorship, on the record</span>
              </Link>
              <div className="flex items-center gap-2 sm:order-last">
                <WalletButton />
              </div>
              <div className="mt-2 w-full sm:mt-0 sm:ml-auto sm:w-auto">
                <Nav />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
          <footer className="border-t border-[var(--line)] px-4 py-6 text-center text-xs leading-relaxed text-[var(--muted)]">
            All demo notices are <strong>synthetic</strong>. Data lives on Arkiv&apos;s Tiramisu testnet — this site is
            only one reader of it. MIT licensed.
          </footer>
        </WalletProvider>
      </body>
    </html>
  )
}
