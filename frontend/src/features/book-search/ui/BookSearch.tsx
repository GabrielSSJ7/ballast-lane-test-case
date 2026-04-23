import { Input } from "../../../shared/ui/Input";

interface BookSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function BookSearch({ value, onChange, placeholder = "Search by title, author, or genre..." }: BookSearchProps) {
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full md:max-w-sm"
    />
  );
}
