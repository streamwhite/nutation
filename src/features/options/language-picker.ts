import Fuse from 'fuse.js';
import {
  TARGET_LANGUAGES,
  findTargetLanguage,
  formatLanguageLabel,
  type TargetLanguage,
} from '@/shared/languages';

const LANGUAGE_SEARCH_LIMIT = 12;

const fuse = new Fuse(TARGET_LANGUAGES, {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'nativeName', weight: 0.3 },
    { name: 'code', weight: 0.2 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
});

export function searchTargetLanguages(query: string): TargetLanguage[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return TARGET_LANGUAGES.slice(0, LANGUAGE_SEARCH_LIMIT);
  }
  return fuse.search(trimmed, { limit: LANGUAGE_SEARCH_LIMIT }).map((result) => result.item);
}

export type LanguagePickerElements = {
  searchInput: HTMLInputElement;
  codeInput: HTMLInputElement;
  results: HTMLElement;
  selectedLabel?: HTMLElement;
};

export function bindLanguagePicker(
  elements: LanguagePickerElements,
  initialCode: string,
): void {
  const { searchInput, codeInput, results, selectedLabel } = elements;

  function setSelected(language: TargetLanguage | null, code = language?.code ?? ''): void {
    codeInput.value = language?.code ?? code;
    if (selectedLabel) {
      selectedLabel.textContent = language
        ? formatLanguageLabel(language)
        : code || 'No language selected';
    }
    if (language) {
      searchInput.value = language.name;
    }
  }

  function renderResults(languages: TargetLanguage[]): void {
    results.replaceChildren();
    if (languages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'list-group-item text-muted small';
      empty.textContent = 'No matching languages';
      results.append(empty);
      return;
    }

    for (const language of languages) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'list-group-item list-group-item-action py-2';
      button.textContent = formatLanguageLabel(language);
      button.addEventListener('click', () => {
        setSelected(language);
        results.classList.add('d-none');
      });
      results.append(button);
    }
  }

  function showMatches(query: string): void {
    renderResults(searchTargetLanguages(query));
    results.classList.remove('d-none');
  }

  const initial = findTargetLanguage(initialCode);
  setSelected(initial, initialCode);

  searchInput.addEventListener('focus', () => {
    showMatches(searchInput.value);
  });

  searchInput.addEventListener('input', () => {
    codeInput.value = '';
    if (selectedLabel) {
      selectedLabel.textContent = 'Type to search, then pick a language';
    }
    showMatches(searchInput.value);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    const [first] = searchTargetLanguages(searchInput.value);
    if (first) {
      setSelected(first);
      results.classList.add('d-none');
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (searchInput.contains(target) || results.contains(target)) {
      return;
    }
    results.classList.add('d-none');
  });
}
