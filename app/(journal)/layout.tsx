import JournalNav, { JournalBackToTimer } from '@/components/journal/JournalNav'
import './journal.css'
import './blog-header.css'
import './projects/public/public-projects.css'
export default function JournalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <div className="journal-shell" data-i18n-ignore>
    <a href="#journal-main" className="journal-skip">Skip to content</a>
    <JournalNav />
    <main id="journal-main" className="journal-main"><JournalBackToTimer />{children}</main>
  </div>
}
