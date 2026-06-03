interface FactsListProps {
  facts: string[]; // already sliced to the revealed count
}

export function FactsList({ facts }: FactsListProps) {
  return (
    <ul className="space-y-1.5">
      {facts.map((fact, i) => (
        <li
          key={i}
          className="flex items-center gap-2 rounded-md bg-panel px-3 py-2 text-sm text-slate-100"
        >
          <span className="text-accent">▸</span>
          <span>{fact}</span>
        </li>
      ))}
    </ul>
  );
}
