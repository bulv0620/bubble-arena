import { useId } from 'react';
/** Original lobby illustration of the block character; formal Blender assets remain separate. */
export function RoomAvatar({ team = 'red', variant = 0 }: { team?: 'red' | 'blue'; variant?: number }) {
  const id = useId(), primary = team === 'red' ? '#f36e60' : '#54b6ef', dark = team === 'red' ? '#ad3e40' : '#2378b1';
  return <svg className="room-avatar" viewBox="0 0 240 270" aria-hidden="true">
    <defs><linearGradient id={id} x2=".7" y2="1"><stop stopColor={primary}/><stop offset="1" stopColor={dark}/></linearGradient></defs>
    <ellipse cx="119" cy="251" rx="79" ry="12" fill="#425c771c"/>
    <path d="M77 222L64 239Q61 251 82 251H101L107 222M133 222L137 251H165Q178 247 166 236L158 218" fill="#fcfcf0" stroke="#355568" strokeWidth="4"/>
    <path d="M76 153Q68 168 76 224Q115 242 159 222L164 170Q148 145 76 153" fill={`url(#${id})`} stroke={dark} strokeWidth="4"/>
    <path d="M91 157L119 181L145 158M119 183V223" fill="none" stroke="#fff6c4" strokeWidth="8"/>
    <circle cx="119" cy="202" r="12" fill="#72dfe8" stroke="#fafff6" strokeWidth="4"/>
    <path d="M76 167L48 190L60 207L88 188M154 171L183 189L173 210L147 191" fill="#fffdf1" stroke="#adccd0" strokeWidth="4"/>
    <path d="M41 74Q36 22 89 19L103 12L135 18Q195 14 198 74L188 125Q167 156 118 158Q66 159 47 124Z" fill={`url(#${id})`} stroke={dark} strokeWidth="4"/>
    <path d="M45 56L35 36Q35 19 51 24L69 32M167 30L183 24Q199 21 200 37L195 59" fill={primary} stroke={dark} strokeWidth="4"/>
    <ellipse cx="120" cy="95" rx="61" ry="46" fill="#ffe6c0" stroke={dark} strokeWidth="3"/>
    <path d="M74 78L96 82M142 82L164 78" stroke="#65504b" strokeWidth="6" strokeLinecap="round"/>
    <rect x="87" y="88" width="9" height="22" rx="4.5" fill="#25475c"/><rect x="143" y="88" width="9" height="22" rx="4.5" fill="#25475c"/>
    <path d={variant % 2 ? 'M109 122Q120 114 133 121' : 'M109 119Q122 133 134 116'} fill="none" stroke="#a76654" strokeWidth="4" strokeLinecap="round"/>
    <path d="M61 56Q67 36 98 32" fill="none" stroke="#ffffff8c" strokeWidth="8" strokeLinecap="round"/>
    <g transform="translate(143 166) rotate(-12)"><path d="M17 7H65V38H35L30 58H14L19 33H4V12Z" fill="#3cbce3" stroke="#25658c" strokeWidth="4"/><rect x="49" y="12" width="34" height="20" rx="6" fill="#f1ffff" stroke="#25658c" strokeWidth="3"/><rect x="78" y="14" width="13" height="16" rx="4" fill="#a7ec8d"/><circle cx="19" cy="21" r="17" fill="#84e4fb" stroke="#f5ffff" strokeWidth="4"/><circle cx="14" cy="15" r="5" fill="#eaffff"/></g>
  </svg>;
}
