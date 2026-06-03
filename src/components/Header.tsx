interface HeaderProps {
  title: string;
}

const ICON_SRC = `${import.meta.env.BASE_URL}italy_icon.png`;

export function Header({ title }: HeaderProps) {
  return (
    <header className="-mb-2 flex items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      <a
        href="https://youtu.be/IGBEp1zTbUw"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Italy (opens a video)"
        className="inline-flex rounded-sm opacity-90 transition duration-200 hover:opacity-100 hover:brightness-110 hover:ring-2 hover:ring-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <img
          src={ICON_SRC}
          alt="Italy"
          className="h-12 w-auto object-contain align-middle sm:h-14"
        />
      </a>
    </header>
  );
}
