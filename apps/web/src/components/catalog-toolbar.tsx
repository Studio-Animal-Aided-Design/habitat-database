import { Search } from "lucide-react";

export function CatalogToolbar({
  action,
  query,
  type,
  types,
  searchLabel
}: {
  action: string;
  query?: string;
  type?: string;
  types: string[];
  searchLabel: string;
}) {
  return (
    <form className="catalog-toolbar" action={action}>
      <Search size={18} aria-hidden="true" />
      <label className="sr-only" htmlFor={`${action}-search`}>{searchLabel}</label>
      <input
        id={`${action}-search`}
        name="q"
        defaultValue={query}
        placeholder={searchLabel}
      />
      <label className="sr-only" htmlFor={`${action}-type`}>Typ filtern</label>
      <select id={`${action}-type`} name="type" defaultValue={type ?? ""}>
        <option value="">Alle Typen</option>
        {types.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <button type="submit">Filtern</button>
    </form>
  );
}
