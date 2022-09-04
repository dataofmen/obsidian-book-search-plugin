import { Book, FrontMatter } from '@models/book.model';
import { DefaultFrontmatterKeyType } from '@settings/settings';
import { App, TFile } from 'obsidian';

// == Format Syntax == //
export const NUMBER_REGEX = /^-?[0-9]*$/;
export const DATE_REGEX = /{{DATE(\+-?[0-9]+)?}}/;
export const DATE_REGEX_FORMATTED = /{{DATE:([^}\n\r+]*)(\+-?[0-9]+)?}}/;

export function replaceIllegalFileNameCharactersInString(text: string) {
  return text.replace(/[\\,#%&{}/*<>$":@.]/g, '').replace(/\s+/g, ' ');
}

export function isISBN(str: string) {
  return /^(97(8|9))?\d{9}(\d|X)$/.test(str);
}

export function makeFileName(book: Book, fileNameFormat?: string) {
  let result;
  if (fileNameFormat) {
    result = replaceVariableSyntax(book, replaceDateInString(fileNameFormat));
  } else {
    result = !book.author ? book.title : `${book.title} - ${book.author}`;
  }
  return replaceIllegalFileNameCharactersInString(result) + '.md';
}

export function changeSnakeCase(book: Book) {
  return Object.entries(book).reduce((acc, [key, value]) => {
    acc[camelToSnakeCase(key)] = value;
    return acc;
  }, {});
}

export function applyDefaultFrontMatter(
  book: Book,
  frontmatter: FrontMatter | string,
  keyType: DefaultFrontmatterKeyType = DefaultFrontmatterKeyType.snakeCase,
) {
  const frontMater = keyType === DefaultFrontmatterKeyType.camelCase ? book : changeSnakeCase(book);

  const extraFrontMatter = typeof frontmatter === 'string' ? parseFrontMatter(frontmatter) : frontmatter;
  for (const key in extraFrontMatter) {
    const value = extraFrontMatter[key]?.toString().trim() ?? '';
    if (frontMater[key] && frontMater[key] !== value) {
      frontMater[key] = `${frontMater[key]}, ${value}`;
    } else {
      frontMater[key] = value;
    }
  }

  return frontMater as object;
}

export function replaceVariableSyntax(book: Book, text: string): string {
  if (!text?.trim()) {
    return '';
  }

  const entries = Object.entries(book);

  return entries
    .reduce((result, [key, val = '']) => {
      return result.replace(new RegExp(`{{${key}}}`, 'ig'), val);
    }, text)
    .replace(/{{\w+}}/gi, '')
    .trim();
}

export function generatorInlineScriptsTemplates(book: Book, text: string) {
  const commandRegex = /<%(?:=)(.+)%>/g;
  const ctor = getFunctionConstructor();
  const matchedList = [...text.matchAll(commandRegex)];
  return matchedList.reduce((result, [matched, script]) => {
    try {
      const outputs = new ctor(
        [
          'const [book] = arguments',
          `const output = ${script}`,
          'if(typeof output === "string") return output',
          'if(Array.isArray(output)) return `[${output.map(val => `"${val}"`).join(", ")}]`',
          'return JSON.stringify(output)',
        ].join(';'),
      )(book);
      return result.replace(matched, outputs);
    } catch (err) {
      console.warn(err);
    }
    return result;
  }, text);
}

export function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter?.toLowerCase()}`);
}

export function parseFrontMatter(frontMatterString: string) {
  if (!frontMatterString) return {};
  return frontMatterString
    .split('\n')
    .map(item => {
      const index = item.indexOf(':');
      if (index === -1) return [item.trim(), ''];

      const key = item.slice(0, index)?.trim();
      const value = item.slice(index + 1)?.trim();
      return [key, value];
    })
    .reduce((acc, [key, value]) => {
      if (key) {
        acc[key] = value?.trim() ?? '';
      }
      return acc;
    }, {});
}

export function toStringFrontMatter(frontMatter: object): string {
  return Object.entries(frontMatter)
    .map(([key, value]) => {
      const newValue = value?.toString().trim() ?? '';
      if (/\r|\n/.test(newValue)) {
        return '';
      }
      if (/:\s/.test(newValue)) {
        return `${key}: "${newValue.replace(/"/g, '&quot;')}"\n`;
      }
      return `${key}: ${newValue}\n`;
    })
    .join('')
    .trim();
}

export function getDate(input?: { format?: string; offset?: number }) {
  let duration;

  if (input.offset !== null && input.offset !== undefined && typeof input.offset === 'number') {
    duration = window.moment.duration(input.offset, 'days');
  }

  return input.format
    ? window.moment().add(duration).format(input.format)
    : window.moment().add(duration).format('YYYY-MM-DD');
}

export function replaceDateInString(input: string) {
  let output: string = input;

  while (DATE_REGEX.test(output)) {
    const dateMatch = DATE_REGEX.exec(output);
    let offset: number;

    if (dateMatch[1]) {
      const offsetString = dateMatch[1].replace('+', '').trim();
      const offsetIsInt = NUMBER_REGEX.test(offsetString);
      if (offsetIsInt) offset = parseInt(offsetString);
    }
    output = replacer(output, DATE_REGEX, getDate({ offset: offset }));
  }

  while (DATE_REGEX_FORMATTED.test(output)) {
    const dateMatch = DATE_REGEX_FORMATTED.exec(output);
    const format = dateMatch[1];
    let offset: number;

    if (dateMatch[2]) {
      const offsetString = dateMatch[2].replace('+', '').trim();
      const offsetIsInt = NUMBER_REGEX.test(offsetString);
      if (offsetIsInt) offset = parseInt(offsetString);
    }

    output = replacer(output, DATE_REGEX_FORMATTED, getDate({ format, offset }));
  }

  return output;
}

function replacer(str: string, reg: RegExp, replaceValue) {
  return str.replace(reg, function () {
    return replaceValue;
  });
}

export async function useTemplaterPluginInFile(app: App, file: TFile) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templater = (app as any).plugins.plugins['templater-obsidian'];
  if (templater && !templater?.settings['trigger_on_file_creation']) {
    await templater.templater.overwrite_file_commands(file);
  }
}

export function getFunctionConstructor(): typeof Function {
  try {
    return new Function('return (function(){}).constructor')();
  } catch (err) {
    console.warn(err);
    if (err instanceof SyntaxError) {
      throw Error('Bad template syntax');
    } else {
      throw err;
    }
  }
}

export function generateCommandRegex(): RegExp {
  return /<%(?:=)\s*(\(?\s*book\s*\)?\s*=>\s*.+)%>/g;
}
