import { Fragment } from 'react'
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    const match = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part)
    if (match) return <a key={index} href={match[2]} rel="nofollow ugc noopener noreferrer">{match[1]}</a>
    return <Fragment key={index}>{part}</Fragment>
  })
}
// Deliberately small Markdown surface: React escapes raw HTML; links allow only http(s).
export default function Markdown({
  content
}: {
  content: string;
}) {
  return <div className="journal-markdown">
    {content.split(/\n\s*\n/).map((block, index) => {
      if (/^#{1,6} /.test(block)) return <h3 key={index}>{inline(block.replace(/^#{1,6} /, ''))}</h3>
      const lines = block.split('\n')
      if (lines.every(line => /^[-*] /.test(line))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inline(line.slice(2))}</li>)}</ul>
      if (lines.every(line => /^\d+\. /.test(line))) return <ol key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+\. /, ''))}</li>)}</ol>
      return <p key={index}>{inline(block)}</p>
    })}
  </div>
}
