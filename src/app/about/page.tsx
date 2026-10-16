import { AT_RISK_DAYS, NOTICE_DAYS, OUTCOME_DAYS, PRESERVE_DAYS } from "@/lib/arkiv"

export const metadata = { title: "How it works · Takedown Ledger" }

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 mb-2 font-serif text-xl">{children}</h2>

export default function About() {
  return (
    <article className="mx-auto max-w-2xl text-[15px] leading-relaxed">
      <h1 className="font-serif text-3xl">How it works</h1>

      <H>The problem</H>
      <p>
        Governments, courts and companies send thousands of demands to remove content every year. The public record of
        those demands is thin and fragile: transparency reports are published at the platform&apos;s discretion, and
        the largest public archive of takedown notices is run by a single organisation that has had to restrict public
        access under pressure. When the record of censorship can itself be removed, censorship becomes invisible.
      </p>

      <H>What changes on Arkiv</H>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Readonly.</strong> Each notice is created with the <code>readonly</code> flag. Nobody — not the filer,
          not us — can rewrite what was demanded.
        </li>
        <li>
          <strong>Sealed.</strong> In the same atomic batch, ownership moves to <code>0x…dEaD</code>, an address nobody
          holds a key for. A filer who is later pressured to delete the notice <em>cannot</em>.
        </li>
        <li>
          <strong>Kept alive by anyone.</strong> Notices live {NOTICE_DAYS} days and are created with{" "}
          <code>permissionlessExtension</code>. Anyone can press Preserve to push the expiry {PRESERVE_DAYS} days later;
          no one can shorten it. Notices that people care about survive; the rest expire on their own.
        </li>
        <li>
          <strong>Attributed.</strong> <code>$creator</code> is immutable, so every notice and outcome shows which
          wallet filed it — even after ownership is sealed away.
        </li>
        <li>
          <strong>Live.</strong> The ledger listens to Arkiv entity events over WebSocket: new notices and extensions
          appear without a refresh.
        </li>
      </ul>

      <H>Entity lifetimes</H>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Notice</strong> — {NOTICE_DAYS} days, extendable by anyone.</li>
        <li><strong>Outcome</strong> — {OUTCOME_DAYS} days. Filing an outcome extends its notice in the same batch so the outcome never outlives the request it answers.</li>
        <li><strong>At risk</strong> — notices with less than {AT_RISK_DAYS} days left are surfaced on the front page.</li>
      </ul>

      <H>What deliberately stays off Arkiv</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>The removed content itself — only a description of it.</li>
        <li>Names or contact details of private individuals. Requesters are organisations.</li>
        <li>The scanned original notice. A future version would store only its hash.</li>
      </ul>

      <H>Why not Postgres, IPFS or a subgraph?</H>
      <p>
        A database has an operator who can be compelled to delete rows or restrict access. IPFS content disappears
        when nobody pins it, has no queries, and has no notion of a record that expires unless someone vouches for it.
        A subgraph only indexes data that must live somewhere else first. Takedown Ledger needs all three properties at
        once: records nobody can delete, attribution nobody can forge, and lifetimes the public — not an operator —
        controls.
      </p>
    </article>
  )
}
