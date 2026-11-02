import { formatPageInfo, readPageInfo, type PageInfo } from '@/features/copy-page/page-info';
import { resolveElementLang } from '@/features/opencc/locale';
import { InPageTranslator } from '@/features/translate/in-page-translate';
import { StageTimer } from '@/features/translate/stage-timer';
import type { TextChunk } from '@/features/translate/types';
import type { ExtensionSettings } from '@/shared/settings';

const TITLE_CHUNK_ID = 'page-info-title';
const DESCRIPTION_CHUNK_ID = 'page-info-description';

function buildChunks(info: PageInfo): TextChunk[] {
  const chunks: TextChunk[] = [];
  if (info.title) {
    chunks.push({ id: TITLE_CHUNK_ID, text: info.title });
  }
  if (info.description) {
    chunks.push({ id: DESCRIPTION_CHUNK_ID, text: info.description });
  }
  return chunks;
}

export async function buildTranslatedPageInfo(
  settings: ExtensionSettings,
  targetLang: string,
  doc: Document = document,
): Promise<string> {
  const info = readPageInfo(doc, settings.copyIncludeLink);
  const chunks = buildChunks(info);
  if (chunks.length === 0) {
    return formatPageInfo(info, settings.copySeparator);
  }

  const pageLang = resolveElementLang(doc.documentElement);
  const translator = new InPageTranslator(settings, targetLang, new StageTimer(), pageLang);
  const { translations } = await translator.translate(chunks);
  const translated = new Map(translations.map((item) => [item.id, item.text]));

  return formatPageInfo({
    title: translated.get(TITLE_CHUNK_ID) ?? info.title,
    description: translated.get(DESCRIPTION_CHUNK_ID) ?? info.description,
    link: info.link,
  }, settings.copySeparator);
}
