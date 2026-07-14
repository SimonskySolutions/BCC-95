/**
 * BCC 95 brand mark — shared, framework-agnostic SVG so the same artwork can be
 * rendered by the React <Logo> component and embedded as a string in the
 * printable offer HTML.
 *
 * The emblem is two interlocking square brackets rotated 45°: the navy "ink"
 * bracket recolors with the theme (dark on light, light on dark) while the blue
 * bracket stays constant since it reads on both backgrounds.
 */

export const LOGO_BLUE = '#5a9fd8'
export const LOGO_INK = '#1e2c5c'

/**
 * Raw SVG markup for the emblem only.
 * @param {{ ink?: string; blue?: string; size?: number }} [opts]
 */
export function logoMarkSvg({ ink = 'currentColor', blue = LOGO_BLUE, size = 28 } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="BCC 95">
  <g transform="rotate(45 50 50)">
    <path d="M18 22 H55 V34 H30 V66 H55 V78 H18 Z" fill="${ink}"/>
    <path d="M82 22 H45 V34 H70 V66 H45 V78 H82 Z" fill="${blue}"/>
  </g>
</svg>`
}
