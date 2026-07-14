import { LOGO_BLUE, logoMarkSvg } from './logoMark.js'

/**
 * BCC 95 brand mark, recreated as a themeable SVG. The navy ink follows
 * `currentColor` (via `inkClassName`) so it flips for light/dark; the blue stays.
 *
 * @param {{
 *   variant?: 'full' | 'mark'
 *   size?: number
 *   className?: string
 *   inkClassName?: string
 * }} props
 */
export default function Logo({ variant = 'full', size = 28, className = '', inkClassName = 'text-[#1e2c5c] dark:text-white' }) {
  const mark = (
    <span
      className={`inline-flex shrink-0 ${inkClassName}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: logoMarkSvg({ ink: 'currentColor', size }) }}
    />
  )

  if (variant === 'mark') {
    return <span className={`inline-flex items-center ${className}`}>{mark}</span>
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark}
      <span className={`font-extrabold tracking-tight ${inkClassName}`} style={{ fontSize: size * 0.62 }}>
        BCC <span style={{ color: LOGO_BLUE }}>95</span>
      </span>
    </span>
  )
}
