interface PixelSproutProps { className?: string; happy?: boolean }

/** Integer-grid artwork: no raster scaling or external asset dependency. */
export default function PixelSprout({ className = '', happy = false }: PixelSproutProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" shapeRendering="crispEdges" className={className} aria-hidden="true">
      <path d="M14 59h37v2H14z" fill="#758457" opacity=".4" />
      <g fill="#273d29">
        <path d="M28 22v-7h-7v-2h-5V6h3V3h9v2h4v5h3V5h4V2h10v3h3v7h-3v3h-8v3h-5v5h8v3h5v5h3v8h4v-3h4v3h2v7h-4v4h-6v6h-4v4h-7v-3H25v3h-7v-4h-4v-8H9v-3H5v-8h3v-3h4v4h2v-9h3v-5h5v-3z" />
        <path d="M8 23H5v-4H3v-3h3v4h2zM56 20v-4h3v-3h2v5h-3v2z" />
      </g>
      <path d="M29 20v-7h-7v-2h-4V7h3V5h6v2h3v5h5V8h5V5h8v2h2v4h-4v2h-7v4h-5v8h-5z" fill="#879867" />
      <path d="M21 6h5v2h-5zM40 6h6v2h-6z" fill="#c8d29b" />
      <path d="M24 25h16v3h7v5h3v12h4v-4h4v-2h2v5h-4v4h-6v7h-4v3h-3v-3H24v3h-4v-4h-4V44h-5v-3H8v-3h3v3h5v-9h4v-4h4z" fill="#eff0c8" />
      <path d="M18 45h4v6h8v2h13v-3h6v5h-6v2H24v-3h-6z" fill="#bdc797" />
      {happy ? <path d="M23 34h3v-2h3v3h-3v2h-3zM38 34h3v-2h3v3h-3v2h-3z" fill="#273d29" /> : <g fill="#273d29"><path d="M23 32h5v8h-5zM39 32h5v8h-5z" /><path d="M24 33h2v2h-2zM40 33h2v2h-2z" fill="#fffde1" /></g>}
      <path d="M30 39h7v4h-2v2h-3v-2h-2z" fill="#273d29" />
      <path d="M18 40h5v3h-5zM44 40h5v3h-5z" fill="#a9b77a" />
      <path d="M18 44h4v3h5v3h8v3h-9v-3h-5v-3h-3zM39 47h8v3h3v6h-3v2h-9v-3h-2v-6h3z" fill="#273d29" />
      <path d="M40 49h5v3h3v3h-8v-2h-2v-2h2z" fill="#879867" />
      <path d="M41 50h4v2h-4z" fill="#eff0c8" />
    </svg>
  )
}
