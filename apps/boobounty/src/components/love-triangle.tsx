const ARCH_BOTTOM = 440;
const ARCH_RADIUS = 115;
const SPRING = 160;

const archPath = (cx: number) =>
  `M ${cx - ARCH_RADIUS} ${ARCH_BOTTOM} V ${SPRING} A ${ARCH_RADIUS} ${ARCH_RADIUS} 0 0 1 ${cx + ARCH_RADIUS} ${SPRING} V ${ARCH_BOTTOM} Z`;

const Shoulders = ({ cx, fill }: { cx: number; fill: string }) => (
  <>
    <rect fill="var(--skin)" height={70} rx={12} width={30} x={cx - 15} y={300} />
    <ellipse cx={cx} cy={480} fill={fill} rx={104} ry={118} />
  </>
);

const Operative = ({ cx }: { cx: number }) => (
  <g>
    <path d={`M ${cx - 52} 280 a 52 56 0 0 1 104 0 V 388 q -52 18 -104 0 Z`} fill="var(--ink)" />
    <Shoulders cx={cx} fill="var(--dress)" />
    <circle cx={cx} cy={278} fill="var(--skin)" r={40} />
    <path d={`M ${cx - 42} 268 q 14 -44 58 -38 q 22 6 26 34 q -30 -26 -84 4 Z`} fill="var(--ink)" />
    <circle cx={cx - 13} cy={284} fill="var(--ink)" r={3.5} />
    <circle cx={cx + 13} cy={284} fill="var(--ink)" r={3.5} />
    <path
      d={`M ${cx - 9} 300 q 9 8 18 0`}
      fill="none"
      stroke="var(--ink)"
      strokeLinecap="round"
      strokeWidth={2.5}
    />
    <circle cx={cx + 22} cy={296} fill="var(--dress)" opacity={0.25} r={7} />
    <circle cx={cx - 22} cy={296} fill="var(--dress)" opacity={0.25} r={7} />
  </g>
);

const Engineer = ({ cx }: { cx: number }) => (
  <g>
    <Shoulders cx={cx} fill="url(#plaid)" />
    <g className="animate-glance">
      <circle cx={cx} cy={278} fill="var(--skin)" r={40} />
      <path
        d={`M ${cx - 42} 270 q -2 -46 44 -46 q 40 2 40 40 q -20 -18 -84 6 Z`}
        fill="var(--ink)"
      />
      <circle cx={cx - 25} cy={282} fill="var(--ink)" r={3.5} />
      <circle cx={cx - 5} cy={282} fill="var(--ink)" r={3.5} />
      <path
        d={`M ${cx - 34} 268 l 12 -4 M ${cx - 12} 264 l 12 2`}
        stroke="var(--ink)"
        strokeLinecap="round"
        strokeWidth={2.5}
      />
      <ellipse cx={cx - 16} cy={302} fill="var(--ink)" rx={4} ry={5} />
    </g>
  </g>
);

const Nda = ({ cx }: { cx: number }) => (
  <g>
    <path d={`M ${cx - 50} 280 a 50 54 0 0 1 100 0 V 334 q -50 10 -100 0 Z`} fill="var(--ink)" />
    <Shoulders cx={cx} fill="var(--teal)" />
    <circle cx={cx} cy={278} fill="var(--skin)" r={40} />
    <path d={`M ${cx - 42} 272 q 4 -46 46 -44 q 38 4 38 44 q -42 -30 -84 0 Z`} fill="var(--ink)" />
    <circle cx={cx - 22} cy={286} fill="var(--ink)" r={3.5} />
    <circle cx={cx - 2} cy={286} fill="var(--ink)" r={3.5} />
    <path
      d={`M ${cx - 32} 272 l 14 6 M ${cx + 8} 272 l -14 6`}
      stroke="var(--ink)"
      strokeLinecap="round"
      strokeWidth={2.5}
    />
    <path d={`M ${cx - 20} 306 h 16`} stroke="var(--ink)" strokeLinecap="round" strokeWidth={2.5} />
  </g>
);

const figures = [
  {
    Art: Operative,
    backdrop: "var(--dress-soft)",
    caption: "A Taiwanese 7 who has read every r/agi thread since GPT-2",
    cx: 150,
    id: "operative",
    role: "Our operative",
  },
  {
    Art: Engineer,
    backdrop: "var(--paper-deep)",
    caption: "Your staff research engineer",
    cx: 450,
    id: "engineer",
    role: "Your attack surface",
  },
  {
    Art: Nda,
    backdrop: "var(--teal-soft)",
    caption: "Your NDA",
    cx: 750,
    id: "nda",
    role: "Your controls",
  },
] as const;

const LoveTriangle = () => (
  <figure className="w-full">
    <svg aria-labelledby="triangle-title" className="block h-auto w-full" viewBox="0 0 900 450">
      <title id="triangle-title">
        Your engineer turns to look at our operative while your NDA glares at him
      </title>
      <defs>
        <pattern height={24} id="plaid" patternUnits="userSpaceOnUse" width={24}>
          <rect fill="oklch(0.42 0.06 250)" height={24} width={24} />
          <rect fill="var(--honey)" height={24} opacity={0.35} width={6} x={9} />
          <rect fill="var(--honey)" height={6} opacity={0.35} width={24} y={9} />
          <rect fill="var(--dress)" height={24} opacity={0.4} width={1.5} x={3} />
        </pattern>
        <marker
          id="arrowhead"
          markerHeight={10}
          markerWidth={10}
          orient="auto-start-reverse"
          refX={6}
          refY={5}
          viewBox="0 0 10 10"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--honey-deep)" />
        </marker>
        <marker
          id="glarehead"
          markerHeight={10}
          markerWidth={10}
          orient="auto-start-reverse"
          refX={6}
          refY={5}
          viewBox="0 0 10 10"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--teal)" />
        </marker>
        {figures.map((figure) => (
          <clipPath id={`arch-${figure.id}`} key={figure.id}>
            <path d={archPath(figure.cx)} />
          </clipPath>
        ))}
      </defs>

      {figures.map(({ Art, backdrop, cx, id }) => (
        <g clipPath={`url(#arch-${id})`} key={id}>
          <path d={archPath(cx)} fill={backdrop} />
          <Art cx={cx} />
        </g>
      ))}

      <path
        className="animate-march"
        d="M 400 214 Q 300 70 205 196"
        fill="none"
        markerEnd="url(#arrowhead)"
        stroke="var(--honey-deep)"
        strokeDasharray="8 4"
        strokeLinecap="round"
        strokeWidth={3}
      />
      <path
        d="M 712 216 Q 610 100 500 210"
        fill="none"
        markerEnd="url(#glarehead)"
        stroke="var(--teal)"
        strokeLinecap="round"
        strokeWidth={3}
      />
      <text
        className="fill-honey-deep font-mono max-sm:hidden"
        fontSize={15}
        letterSpacing={1.5}
        textAnchor="middle"
        x={302}
        y={118}
      >
        ATTENTION
      </text>
      <text
        className="fill-teal font-mono max-sm:hidden"
        fontSize={15}
        letterSpacing={1.5}
        textAnchor="middle"
        x={606}
        y={136}
      >
        COMPLIANCE
      </text>
    </svg>
    <figcaption className="mt-6 grid grid-cols-3 gap-3 text-center sm:gap-8">
      {figures.map((figure) => (
        <div key={figure.id}>
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase sm:text-xs">
            {figure.role}
          </p>
          <p className="mt-2 font-serif text-base leading-tight italic sm:text-2xl">
            {figure.caption}
          </p>
        </div>
      ))}
    </figcaption>
  </figure>
);

export { LoveTriangle };
