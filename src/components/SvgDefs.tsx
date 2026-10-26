/**
 * Shared SVG definitions, rendered once. Reference from any inline SVG via
 * url(#id). Keep ids stable — see CONTRACT.md.
 */
export default function SvgDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        {/* Rough, slightly wobbly ink contour */}
        <filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Stronger edge bleed for screen-print look */}
        <filter id="ink-bleed" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feMorphology in="d" operator="dilate" radius="0.3" />
        </filter>
        {/* Print misregistration: offsets a red ghost under the art */}
        <filter id="misregister" x="-5%" y="-5%" width="110%" height="110%">
          <feOffset in="SourceAlpha" dx="3" dy="2" result="o" />
          <feFlood floodColor="#722F37" floodOpacity="0.55" />
          <feComposite in2="o" operator="in" result="ghost" />
          <feMerge>
            <feMergeNode in="ghost" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Paper grain applied to paper-colored fills */}
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="11" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g" result="g2">
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
          <feComposite in="g2" in2="SourceGraphic" operator="in" result="gm" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="gm" />
          </feMerge>
        </filter>

        {/* Hatch patterns (black ink) */}
        <pattern id="hatch-diag" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#050505" strokeWidth="1.4" />
        </pattern>
        <pattern id="hatch-diag-fine" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#050505" strokeWidth="0.8" />
        </pattern>
        <pattern id="hatch-cross" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <path d="M0 0V6M0 0H6" stroke="#050505" strokeWidth="1" />
        </pattern>
        <pattern id="scan-v" width="5" height="10" patternUnits="userSpaceOnUse">
          <rect width="2.2" height="10" fill="#050505" />
        </pattern>
        <pattern id="scan-h" width="10" height="5" patternUnits="userSpaceOnUse">
          <rect width="10" height="2" fill="#050505" />
        </pattern>
        <pattern id="halftone" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <circle cx="3.5" cy="3.5" r="1.5" fill="#050505" />
        </pattern>
        <pattern id="halftone-paper" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <circle cx="3.5" cy="3.5" r="1.3" fill="#E8DCC6" />
        </pattern>
      </defs>
    </svg>
  );
}
