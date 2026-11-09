/* Hand-drawn product illustrations for the demo storefront (200x160 canvas, ground line at y=130). */

// Draws a shape twice: flat colour, then a soft light-to-shadow gradient over it for volume.
const Sh = ({ el: El = "path", fill, ...p }) => (
  <>
    <El {...p} fill={fill} />
    <El {...p} fill="url(#lp-sh)" />
  </>
);

const Ground = ({ rx = 44 }) => (
  <ellipse cx="100" cy="131" rx={rx} ry="5.5" fill="#111827" opacity="0.14" />
);

const ART = {
  "Glow serum": (
    <>
      <Ground rx={30} />
      <Sh el="rect" x="76" y="60" width="48" height="70" rx="11" fill="#C98F6B" />
      <rect x="83" y="86" width="34" height="26" rx="3" fill="#FBF6EE" />
      <rect x="88" y="93" width="24" height="3" rx="1.5" fill="#C98F6B" />
      <rect x="88" y="100" width="16" height="2.5" rx="1.25" fill="#D9C7B3" />
      <Sh el="rect" x="87" y="48" width="26" height="15" rx="3" fill="#2B2F3A" />
      <Sh el="rect" x="91" y="20" width="18" height="32" rx="9" fill="#3A3F4C" />
    </>
  ),
  "Velvet tint": (
    <>
      <Ground rx={24} />
      <Sh el="rect" x="80" y="88" width="40" height="42" rx="5" fill="#2B2F3A" />
      <Sh el="rect" x="80" y="78" width="40" height="12" rx="2" fill="#C9B28A" />
      <Sh d="M87 78V54L100 40L113 54V78Z" fill="#B8423F" />
    </>
  ),
  "Skin kit": (
    <>
      <Ground />
      <Sh el="rect" x="70" y="48" width="22" height="46" rx="6" fill="#F5F0E6" />
      <Sh el="rect" x="73" y="40" width="16" height="12" rx="3" fill="#C9B28A" />
      <Sh el="rect" x="112" y="70" width="30" height="26" rx="6" fill="#E9DDCB" />
      <Sh el="rect" x="56" y="84" width="88" height="46" rx="6" fill="#7E9A86" />
      <rect x="56" y="84" width="88" height="14" rx="5" fill="#6B8873" />
      <rect x="92" y="108" width="16" height="6" rx="3" fill="#F5F0E6" />
    </>
  ),
  "Wool coat": (
    <>
      <Ground rx={42} />
      <Sh d="M62 58L84 44L100 62L116 44L138 58L146 130H54Z" fill="#B8A58A" />
      <Sh d="M84 44L100 62L92 96L76 62Z" fill="#9A8770" />
      <Sh d="M116 44L100 62L108 96L124 62Z" fill="#9A8770" />
      <path d="M100 62V130" stroke="#8A7760" strokeWidth="1.5" />
      <circle cx="104" cy="92" r="2.6" fill="#2B2F3A" />
      <circle cx="104" cy="108" r="2.6" fill="#2B2F3A" />
      <rect x="66" y="108" width="20" height="3" rx="1.5" fill="#8A7760" />
    </>
  ),
  "Court low": (
    <>
      <Ground rx={52} />
      <Sh d="M44 110H160Q164 126 150 128H56Q42 126 44 110Z" fill="#E6E1D6" />
      <Sh
        d="M46 110L46 66Q48 56 60 58L76 62Q86 74 100 78L122 84Q150 92 160 106L160 111Z"
        fill="#F7F5F0"
      />
      <path
        d="M100 78L112 70M108 82L120 74M116 86L128 78"
        stroke="#1F2937"
        strokeWidth="2.400"
        strokeLinecap="round"
      />
      <path d="M130 90Q152 96 160 108L160 111Q140 108 122 104Z" fill="#E9E4D8" />
      <path
        d="M62 108Q54 90 60 72"
        fill="none"
        stroke="#1F2937"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M72 106Q96 98 126 104"
        fill="none"
        stroke="#1F2937"
        strokeWidth="4.500"
        strokeLinecap="round"
      />
      <rect x="46" y="64" width="9" height="22" rx="3" fill="#C9B28A" />
      <path d="M48 118H158" stroke="#C9C3B3" strokeWidth="1.500" />
    </>
  ),
  "Day bag": (
    <>
      <Ground rx={48} />
      <path
        d="M78 78V64Q78 46 100 46Q122 46 122 64V78"
        fill="none"
        stroke="#5A432F"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <Sh d="M54 76H146L154 130H46Z" fill="#7B5E45" />
      <Sh d="M54 76H146L141 98Q100 110 59 98Z" fill="#6A4F3A" />
      <circle cx="100" cy="101" r="5" fill="#C9B28A" />
      <path d="M62 112H138" stroke="#5A432F" strokeWidth="1.5" strokeDasharray="3 3" />
    </>
  ),
  "Studio cans": (
    <>
      <Ground rx={46} />
      <path
        d="M64 98V86Q64 42 100 42Q136 42 136 86V98"
        fill="none"
        stroke="#1F2937"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M72 62Q100 36 128 62"
        fill="none"
        stroke="#C9B28A"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <Sh el="rect" x="50" y="88" width="28" height="42" rx="12" fill="#1F2937" />
      <Sh el="rect" x="122" y="88" width="28" height="42" rx="12" fill="#1F2937" />
      <circle cx="64" cy="109" r="7" fill="#C9B28A" />
      <circle cx="136" cy="109" r="7" fill="#C9B28A" />
    </>
  ),
  "Pulse watch": (
    <>
      <Ground rx={30} />
      <Sh el="rect" x="84" y="22" width="32" height="108" rx="9" fill="#1F2937" />
      <rect x="126" y="72" width="6" height="14" rx="2" fill="#B49A6B" />
      <Sh el="circle" cx="100" cy="78" r="32" fill="#C9B28A" />
      <circle cx="100" cy="78" r="25" fill="#0F172A" />
      <path d="M100 78V62M100 78L112 84" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="100" cy="78" r="2.6" fill="#C9B28A" />
      {[0, 90, 180, 270].map((a) => (
        <rect
          key={a}
          x="99"
          y="56"
          width="2"
          height="4"
          fill="#fff"
          opacity="0.6"
          transform={`rotate(${a} 100 78)`}
        />
      ))}
    </>
  ),
  "Power brick": (
    <>
      <Ground rx={42} />
      <rect x="86" y="38" width="7" height="22" rx="2" fill="#9AA3AD" />
      <rect x="107" y="38" width="7" height="22" rx="2" fill="#9AA3AD" />
      <Sh el="rect" x="62" y="56" width="76" height="74" rx="13" fill="#F3F4F6" />
      <rect x="80" y="96" width="40" height="9" rx="4.5" fill="#1F2937" />
      <rect x="80" y="112" width="24" height="9" rx="4.5" fill="#1F2937" />
      <circle cx="115" cy="76" r="3" fill="#C9B28A" />
      <rect x="78" y="73" width="22" height="3" rx="1.5" fill="#D1D5DB" />
    </>
  ),
  "Bearing set": (
    <>
      <Ground rx={44} />
      <Sh el="circle" cx="100" cy="86" r="44" fill="#B4BBC4" />
      <circle cx="100" cy="86" r="35" fill="#DDE1E6" />
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <Sh
            key={i}
            el="circle"
            cx={100 + Math.cos(a) * 26}
            cy={86 + Math.sin(a) * 26}
            r="6.5"
            fill="#9AA3AD"
          />
        );
      })}
      <Sh el="circle" cx="100" cy="86" r="19" fill="#A5ADB6" />
      <circle cx="100" cy="86" r="10" fill="#E5E0D3" />
    </>
  ),
  "Fastener box": (
    <>
      <Ground rx={48} />
      <Sh el="rect" x="78" y="46" width="9" height="30" rx="1.5" fill="#9AA3AD" />
      <Sh el="rect" x="74" y="38" width="17" height="10" rx="2" fill="#B4BBC4" />
      <Sh el="rect" x="112" y="52" width="9" height="26" rx="1.5" fill="#9AA3AD" />
      <Sh el="rect" x="108" y="44" width="17" height="10" rx="2" fill="#B4BBC4" />
      <Sh el="rect" x="56" y="70" width="88" height="60" rx="4" fill="#B8956A" />
      <rect x="56" y="70" width="88" height="15" rx="3" fill="#A6845A" />
      <rect x="72" y="94" width="40" height="26" rx="2" fill="#FBF6EE" />
      <rect x="77" y="100" width="26" height="3" rx="1.5" fill="#1F2937" />
      <rect x="77" y="107" width="18" height="3" rx="1.5" fill="#B8956A" />
      <rect x="77" y="113" width="22" height="2.5" rx="1.25" fill="#D9C7B3" />
    </>
  ),
  "Tool crate": (
    <>
      <Ground rx={50} />
      <g transform="rotate(24 126 52)">
        <Sh el="rect" x="122" y="14" width="9" height="56" rx="3" fill="#6B7280" />
        <Sh el="circle" cx="126.500" cy="16" r="11" fill="#6B7280" />
        <rect x="123" y="2" width="7" height="14" fill="#E5E0D3" />
      </g>
      <Sh el="rect" x="52" y="66" width="96" height="64" rx="3" fill="#A07A4F" />
      {[78, 94, 110].map((y) => (
        <rect key={y} x="52" y={y} width="96" height="2.5" fill="#7E5E3B" opacity="0.6" />
      ))}
      <rect x="52" y="66" width="8" height="64" fill="#7E5E3B" />
      <rect x="140" y="66" width="8" height="64" fill="#7E5E3B" />
      <rect x="82" y="84" width="36" height="9" rx="4.5" fill="#6A4F32" />
    </>
  ),
  Avocados: (
    <>
      <Ground rx={36} />
      <Sh
        d="M100 26C78 26 62 60 62 92C62 117 78 131 100 131C122 131 138 117 138 92C138 60 122 26 100 26Z"
        fill="#3E5B2E"
      />
      <path
        d="M100 34C82 34 70 63 70 92C70 112 82 124 100 124C118 124 130 112 130 92C130 63 118 34 100 34Z"
        fill="#C9D77A"
      />
      <path
        d="M100 52C90 52 84 72 84 94C84 110 91 118 100 118C109 118 116 110 116 94C116 72 110 52 100 52Z"
        fill="#E3EBA0"
      />
      <Sh el="circle" cx="100" cy="97" r="17" fill="#8A5A3A" />
      <circle cx="94" cy="91" r="4" fill="#fff" opacity="0.25" />
    </>
  ),
  Sourdough: (
    <>
      <Ground rx={52} />
      <Sh d="M44 108Q44 64 100 62Q156 64 156 108Q156 128 100 128Q44 128 44 108Z" fill="#C98B4B" />
      <path
        d="M70 84Q84 74 92 92M96 80Q110 70 118 88M122 86Q134 78 140 94"
        fill="none"
        stroke="#F0D9B0"
        strokeWidth="5.500"
        strokeLinecap="round"
      />
      <path
        d="M52 112Q100 124 148 112"
        fill="none"
        stroke="#A9702F"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="82" cy="104" r="1.500" fill="#F0D9B0" />
      <circle cx="112" cy="108" r="1.500" fill="#F0D9B0" />
      <circle cx="132" cy="102" r="1.500" fill="#F0D9B0" />
    </>
  ),
  "Aged cheddar": (
    <>
      <Ground rx={54} />
      <Sh d="M40 106L100 68L160 94L98 120Z" fill="#F2CB63" />
      <Sh d="M40 106L98 120V134L40 122Z" fill="#E0A93B" />
      <Sh d="M98 120L160 94V108L98 134Z" fill="#CF972C" />
      <ellipse cx="96" cy="94" rx="6" ry="3.500" fill="#D9A53A" />
      <ellipse cx="124" cy="92" rx="4" ry="2.500" fill="#D9A53A" />
      <ellipse cx="78" cy="106" rx="4" ry="2.500" fill="#D9A53A" />
    </>
  ),
};

export const hasArt = (name) => Boolean(ART[name]);

export default function ProductArt({ name, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 200 160" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lp-sh" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      {ART[name]}
    </svg>
  );
}
