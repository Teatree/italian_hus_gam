interface HeaderProps {
  title: string;
}

// Irish tricolor (green / white / orange), drawn so it renders identically on every OS
// (unlike the 🇮🇪 emoji, which Windows shows as the letters "IE").
function IrishFlag() {
  return (
    <svg
      viewBox="0 0 60 30"
      role="img"
      aria-label="Flag of Ireland"
      className="inline-block h-6 w-auto rounded-sm align-middle shadow ring-1 ring-white/30"
    >
      <rect x="0" y="0" width="20" height="30" fill="#169B62" />
      <rect x="20" y="0" width="20" height="30" fill="#FFFFFF" />
      <rect x="40" y="0" width="20" height="30" fill="#FF883E" />
    </svg>
  );
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="mb-4 flex items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      <IrishFlag />
    </header>
  );
}
