import { MemeTemplate } from '../types';

// Helper to generate vector SVG data URLs for classic meme templates so they load flawlessly without external dependencies
function generateMemeSvg(name: string, bgGradient: string, accentContent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        ${bgGradient}
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>
    <rect width="600" height="600" fill="url(#bg)"/>
    <g filter="url(#shadow)">
      ${accentContent}
    </g>
    <rect width="600" height="600" fill="none" stroke="#38BDF8" stroke-width="4" opacity="0.3"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CLASSIC_MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: 'drake-hotline',
    name: 'Drake Hotline Bling',
    url: generateMemeSvg(
      'Drake Hotline Bling',
      '<stop offset="0%" stop-color="#1E1B4B"/><stop offset="100%" stop-color="#312E81"/>',
      `<!-- 2 Panels -->
       <line x1="0" y1="300" x2="600" y2="300" stroke="#4F46E5" stroke-width="6"/>
       <line x1="200" y1="0" x2="200" y2="600" stroke="#4F46E5" stroke-width="6"/>
       <!-- Top Left: Dislike Drake -->
       <g transform="translate(100, 150)">
         <circle cx="0" cy="-30" r="40" fill="#F87171"/>
         <path d="M-20,-30 Q0,-50 20,-30" stroke="#7F1D1D" stroke-width="6" fill="none"/>
         <path d="M-20,-10 Q0,0 20,-10" stroke="#7F1D1D" stroke-width="6" fill="none"/>
         <text x="0" y="50" font-family="sans-serif" font-weight="900" font-size="28" fill="#FCA5A5" text-anchor="middle">NAH ✋</text>
       </g>
       <!-- Bottom Left: Like Drake -->
       <g transform="translate(100, 450)">
         <circle cx="0" cy="-30" r="40" fill="#4ADE80"/>
         <path d="M-20,-35 Q0,-20 20,-35" stroke="#14532D" stroke-width="6" fill="none"/>
         <path d="M-20,-10 Q0,10 20,-10" stroke="#14532D" stroke-width="6" fill="none"/>
         <text x="0" y="50" font-family="sans-serif" font-weight="900" font-size="28" fill="#86EFAC" text-anchor="middle">YEAH 👉</text>
       </g>
       <text x="400" y="160" font-family="sans-serif" font-weight="bold" font-size="20" fill="#A5B4FC" text-anchor="middle">[TOP REJECTED PANEL]</text>
       <text x="400" y="460" font-family="sans-serif" font-weight="bold" font-size="20" fill="#A5B4FC" text-anchor="middle">[BOTTOM APPROVED PANEL]</text>`
    )
  },
  {
    id: 'two-buttons',
    name: 'Two Buttons Choice',
    url: generateMemeSvg(
      'Two Buttons',
      '<stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/>',
      `<!-- Machine with 2 Buttons -->
       <rect x="50" y="80" width="500" height="240" rx="16" fill="#334155" stroke="#64748B" stroke-width="4"/>
       <!-- Red Button 1 -->
       <ellipse cx="180" cy="200" rx="70" ry="45" fill="#EF4444" stroke="#991B1B" stroke-width="4"/>
       <text x="180" y="208" font-family="sans-serif" font-weight="bold" font-size="16" fill="#FFFFFF" text-anchor="middle">OPTION A</text>
       <!-- Red Button 2 -->
       <ellipse cx="420" cy="200" rx="70" ry="45" fill="#EF4444" stroke="#991B1B" stroke-width="4"/>
       <text x="420" y="208" font-family="sans-serif" font-weight="bold" font-size="16" fill="#FFFFFF" text-anchor="middle">OPTION B</text>
       <!-- Sweating guy in bottom half -->
       <g transform="translate(300, 470)">
         <circle cx="0" cy="0" r="70" fill="#FDE047"/>
         <!-- Sweat drops -->
         <path d="M-50,-20 Q-60,-10 -50,0 Q-40,-10 -50,-20" fill="#38BDF8"/>
         <path d="M50,-30 Q40,-20 50,-10 Q60,-20 50,-30" fill="#38BDF8"/>
         <!-- Worried face -->
         <circle cx="-25" cy="-15" r="8" fill="#1E293B"/>
         <circle cx="25" cy="-15" r="8" fill="#1E293B"/>
         <path d="M-30,25 Q0,5 30,25" stroke="#1E293B" stroke-width="6" fill="none"/>
       </g>`
    )
  },
  {
    id: 'distracted-bf',
    name: 'Distracted Boyfriend',
    url: generateMemeSvg(
      'Distracted Boyfriend',
      '<stop offset="0%" stop-color="#0284C7"/><stop offset="100%" stop-color="#0F172A"/>',
      `<!-- 3 Characters -->
       <!-- Girlfriend (Angry Left) -->
       <g transform="translate(120, 320)">
         <circle cx="0" cy="-60" r="45" fill="#F472B6"/>
         <text x="0" y="-120" font-family="sans-serif" font-weight="bold" font-size="18" fill="#FBCFE8" text-anchor="middle">CURRENT THING</text>
         <!-- Angry Eyes -->
         <path d="M-20,-70 L-5,-60" stroke="#881337" stroke-width="5"/>
         <path d="M20,-70 L5,-60" stroke="#881337" stroke-width="5"/>
         <circle cx="-15" cy="-55" r="5" fill="#881337"/>
         <circle cx="15" cy="-55" r="5" fill="#881337"/>
         <path d="M-20,-35 Q0,-50 20,-35" stroke="#881337" stroke-width="5" fill="none"/>
       </g>

       <!-- Boyfriend (Middle Turning Head) -->
       <g transform="translate(300, 320)">
         <circle cx="0" cy="-60" r="50" fill="#60A5FA"/>
         <text x="0" y="-130" font-family="sans-serif" font-weight="bold" font-size="20" fill="#BFDBFE" text-anchor="middle">ME / YOU</text>
         <!-- Looking right with heart eyes -->
         <text x="15" y="-55" font-size="28">😍</text>
       </g>

       <!-- New Girl (Right Walking By) -->
       <g transform="translate(480, 320)">
         <circle cx="0" cy="-60" r="45" fill="#A7F3D0"/>
         <text x="0" y="-120" font-family="sans-serif" font-weight="bold" font-size="18" fill="#D1FAE5" text-anchor="middle">NEW TEMPTATION</text>
         <circle cx="-15" cy="-60" r="6" fill="#065F46"/>
         <circle cx="15" cy="-60" r="6" fill="#065F46"/>
         <path d="M-20,-40 Q0,-25 20,-40" stroke="#065F46" stroke-width="5" fill="none"/>
       </g>
       <!-- Direction Arrow -->
       <path d="M250,260 Q380,220 420,260" stroke="#F43F5E" stroke-width="6" stroke-dasharray="8 8" fill="none"/>
       <polygon points="430,265 410,250 415,275" fill="#F43F5E"/>`
    )
  },
  {
    id: 'expanding-brain',
    name: 'Expanding Brain',
    url: generateMemeSvg(
      'Expanding Brain',
      '<stop offset="0%" stop-color="#18181B"/><stop offset="100%" stop-color="#27272A"/>',
      `<!-- 4 Tiers -->
       <line x1="0" y1="150" x2="600" y2="150" stroke="#52525B" stroke-width="3"/>
       <line x1="0" y1="300" x2="600" y2="300" stroke="#52525B" stroke-width="3"/>
       <line x1="0" y1="450" x2="600" y2="450" stroke="#52525B" stroke-width="3"/>
       <line x1="300" y1="0" x2="300" y2="600" stroke="#52525B" stroke-width="3"/>

       <!-- Brain 1: Small -->
       <g transform="translate(450, 75)"><circle cx="0" cy="0" r="30" fill="#71717A"/><text x="0" y="8" font-size="24" text-anchor="middle">🧠</text></g>
       <!-- Brain 2: Glowing -->
       <g transform="translate(450, 225)"><circle cx="0" cy="0" r="35" fill="#38BDF8"/><text x="0" y="8" font-size="30" text-anchor="middle">⚡</text></g>
       <!-- Brain 3: Radiant -->
       <g transform="translate(450, 375)"><circle cx="0" cy="0" r="40" fill="#818CF8"/><text x="0" y="10" font-size="36" text-anchor="middle">✨</text></g>
       <!-- Brain 4: Cosmic -->
       <g transform="translate(450, 525)"><circle cx="0" cy="0" r="45" fill="#F43F5E"/><text x="0" y="12" font-size="42" text-anchor="middle">🌌</text></g>

       <text x="150" y="80" font-family="sans-serif" font-weight="bold" font-size="16" fill="#A1A1AA" text-anchor="middle">TIER 1 (Basic)</text>
       <text x="150" y="230" font-family="sans-serif" font-weight="bold" font-size="16" fill="#A1A1AA" text-anchor="middle">TIER 2 (Smart)</text>
       <text x="150" y="380" font-family="sans-serif" font-weight="bold" font-size="16" fill="#A1A1AA" text-anchor="middle">TIER 3 (Galaxy)</text>
       <text x="150" y="530" font-family="sans-serif" font-weight="bold" font-size="16" fill="#A1A1AA" text-anchor="middle">TIER 4 (Multiverse)</text>`
    )
  },
  {
    id: 'change-my-mind',
    name: 'Change My Mind',
    url: generateMemeSvg(
      'Change My Mind',
      '<stop offset="0%" stop-color="#1E293B"/><stop offset="100%" stop-color="#0F172A"/>',
      `<!-- Table & Mug -->
       <rect x="80" y="280" width="440" height="160" rx="8" fill="#B45309" stroke="#78350F" stroke-width="4"/>
       <!-- White Banner on Table -->
       <rect x="120" y="310" width="360" height="100" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
       <text x="300" y="355" font-family="sans-serif" font-weight="900" font-size="22" fill="#0F172A" text-anchor="middle">[HOT TAKE HERE]</text>
       <text x="300" y="385" font-family="sans-serif" font-weight="bold" font-size="16" fill="#DC2626" text-anchor="middle">CHANGE MY MIND.</text>
       <!-- Guy Sitting Behind -->
       <g transform="translate(300, 200)">
         <circle cx="0" cy="0" r="45" fill="#FDE047"/>
         <circle cx="-15" cy="-10" r="5" fill="#1E293B"/>
         <circle cx="15" cy="-10" r="5" fill="#1E293B"/>
         <path d="M-20,15 Q0,25 20,15" stroke="#1E293B" stroke-width="4" fill="none"/>
         <!-- Mug in hand -->
         <rect x="60" y="40" width="25" height="35" rx="3" fill="#E2E8F0"/>
       </g>`
    )
  },
  {
    id: 'doge-meme',
    name: 'Doge Classic',
    url: generateMemeSvg(
      'Doge',
      '<stop offset="0%" stop-color="#FEF08A"/><stop offset="100%" stop-color="#CA8A04"/>',
      `<!-- Doge Face in Center -->
       <g transform="translate(300, 300)">
         <ellipse cx="0" cy="0" rx="140" ry="120" fill="#EAB308"/>
         <ellipse cx="0" cy="30" rx="70" ry="50" fill="#FEF08A"/>
         <!-- Nose -->
         <ellipse cx="0" cy="10" rx="16" ry="12" fill="#1E293B"/>
         <!-- Big Eyebrows & Eyes -->
         <circle cx="-50" cy="-30" r="16" fill="#FFFFFF"/>
         <circle cx="-45" cy="-30" r="8" fill="#1E293B"/>
         <circle cx="50" cy="-30" r="16" fill="#FFFFFF"/>
         <circle cx="55" cy="-30" r="8" fill="#1E293B"/>
         <!-- Smile -->
         <path d="M-30,40 Q0,65 30,40" stroke="#854D0E" stroke-width="6" fill="none"/>
       </g>
       <!-- Floating comic sans hints -->
       <text x="80" y="100" font-family="Comic Sans MS, cursive" font-weight="bold" font-size="24" fill="#E11D48">much wow</text>
       <text x="450" y="120" font-family="Comic Sans MS, cursive" font-weight="bold" font-size="24" fill="#0284C7">very meme</text>
       <text x="90" y="480" font-family="Comic Sans MS, cursive" font-weight="bold" font-size="24" fill="#16A34A">so battle</text>
       <text x="420" y="500" font-family="Comic Sans MS, cursive" font-weight="bold" font-size="24" fill="#9333EA">such win</text>`
    )
  },
  {
    id: 'woman-cat',
    name: 'Woman Yelling at Cat',
    url: generateMemeSvg(
      'Woman Yelling at Cat',
      '<stop offset="0%" stop-color="#312E81"/><stop offset="100%" stop-color="#0F172A"/>',
      `<!-- 2 Split Panels -->
       <line x1="300" y1="0" x2="300" y2="600" stroke="#6366F1" stroke-width="6"/>
       <!-- Left: Angry Woman -->
       <g transform="translate(150, 300)">
         <circle cx="0" cy="-40" r="55" fill="#EC4899"/>
         <text x="0" y="-110" font-family="sans-serif" font-weight="900" font-size="20" fill="#FBCFE8" text-anchor="middle">ANGRY ACCUSER</text>
         <!-- Pointing finger -->
         <path d="M40,0 L110,-20" stroke="#F472B6" stroke-width="12" stroke-linecap="round"/>
         <!-- Screaming Face -->
         <circle cx="-20" cy="-50" r="8" fill="#831843"/>
         <circle cx="20" cy="-50" r="8" fill="#831843"/>
         <ellipse cx="0" cy="-20" rx="20" ry="25" fill="#831843"/>
       </g>
       <!-- Right: Confused Cat at Dinner Table -->
       <g transform="translate(450, 300)">
         <rect x="-100" y="50" width="200" height="20" fill="#94A3B8"/>
         <!-- Salad Plate -->
         <ellipse cx="0" cy="45" rx="50" ry="15" fill="#CBD5E1"/>
         <!-- White Cat -->
         <circle cx="0" cy="-40" r="50" fill="#FFFFFF"/>
         <text x="0" y="-110" font-family="sans-serif" font-weight="900" font-size="20" fill="#E2E8F0" text-anchor="middle">CONFUSED CAT</text>
         <!-- Smug eyes -->
         <path d="M-25,-45 Q-15,-35 -5,-45" stroke="#1E293B" stroke-width="4" fill="none"/>
         <path d="M5,-45 Q15,-35 25,-45" stroke="#1E293B" stroke-width="4" fill="none"/>
         <path d="M-10,-25 Q0,-15 10,-25" stroke="#1E293B" stroke-width="3" fill="none"/>
       </g>`
    )
  }
];
