interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="mb-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
    </header>
  );
}
