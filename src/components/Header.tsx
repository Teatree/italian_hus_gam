import { DEFAULT_TITLE_ICON, DEFAULT_TITLE_ICON_URL } from '../admin';

interface HeaderProps {
  title: string;
  // Filename (in public/) of the title icon and the link it points to. Both fall back to the
  // admin defaults so the header still renders on the come-back screen (no active property).
  iconFile?: string;
  iconHref?: string;
}

export function Header({ title, iconFile, iconHref }: HeaderProps) {
  const iconSrc = `${import.meta.env.BASE_URL}${iconFile ?? DEFAULT_TITLE_ICON}`;
  const href = iconHref ?? DEFAULT_TITLE_ICON_URL;
  return (
    <header className="-mb-2 flex items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bonus link (opens in a new tab)"
        className="inline-flex rounded-sm opacity-90 transition duration-200 hover:opacity-100 hover:brightness-110 hover:ring-2 hover:ring-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <img
          src={iconSrc}
          alt=""
          className="h-12 w-auto object-contain align-middle sm:h-14"
        />
      </a>
    </header>
  );
}
