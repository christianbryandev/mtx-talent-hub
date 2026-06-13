export const PulseSvgDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
    <defs>
      <linearGradient id="grad-brand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F58529" />
        <stop offset="25%" stopColor="#DD2A7B" />
        <stop offset="50%" stopColor="#C7288B" />
        <stop offset="75%" stopColor="#8131AF" />
        <stop offset="100%" stopColor="#515BD4" />
      </linearGradient>
      <linearGradient id="grad-warm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F58529" />
        <stop offset="100%" stopColor="#DD2A7B" />
      </linearGradient>
      <linearGradient id="grad-mid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#DD2A7B" />
        <stop offset="100%" stopColor="#8131AF" />
      </linearGradient>
      <linearGradient id="grad-cool" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8131AF" />
        <stop offset="100%" stopColor="#515BD4" />
      </linearGradient>
    </defs>
  </svg>
);
