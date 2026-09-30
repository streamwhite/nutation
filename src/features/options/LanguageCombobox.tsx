import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchTargetLanguages } from '@/features/options/language-search';
import { findTargetLanguage, formatLanguageLabel } from '@/shared/languages';

type LanguageComboboxProps = {
  value: string;
  onValueChange: (code: string) => void;
};

export function LanguageCombobox({ value, onValueChange }: LanguageComboboxProps) {
  const intl = useIntl();
  const selected = findTargetLanguage(value);
  const [query, setQuery] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(findTargetLanguage(value)?.name ?? '');
  }, [value]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const results = open ? searchTargetLanguages(query) : [];

  const select = (code: string) => {
    onValueChange(code);
    setOpen(false);
  };

  const onQueryChange = (next: string) => {
    setQuery(next);
    onValueChange('');
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const [first] = searchTargetLanguages(query);
            if (first) {
              select(first.code);
            }
          }
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="target-language-results"
        spellCheck={false}
        autoComplete="off"
        placeholder={intl.formatMessage({ id: 'options.targetLanguageSearchPlaceholder' })}
      />

      {open && (
        <div
          id="target-language-results"
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {intl.formatMessage({ id: 'options.targetLanguageNoMatches' })}
            </p>
          ) : (
            results.map((language) => (
              <button
                key={language.code}
                type="button"
                role="option"
                aria-selected={language.code === value}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground',
                  language.code === value && 'bg-accent text-accent-foreground',
                )}
                onClick={() => select(language.code)}
              >
                <span>{formatLanguageLabel(language)}</span>
                {language.code === value && <Check className="size-4 shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}

      {!selected && !open && (
        <p className="mt-1 text-xs text-muted-foreground">
          {intl.formatMessage({ id: 'options.targetLanguageTypeToSearch' })}
        </p>
      )}
    </div>
  );
}
