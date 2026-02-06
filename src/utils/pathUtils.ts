/**
 * Path and filename template utilities
 * Resolves placeholders like {project}, {year}, {quarter}, {week}, {date}
 */

export interface FilenameVars {
  project?: string;
  year?: number | string;
  quarter?: number | string;
  week?: string;
  date?: string;
}

/**
 * Resolve template placeholders in a filename string
 * Supported placeholders: {project}, {year}, {quarter}, {week}, {date}
 * Unknown placeholders are left as-is
 * If {project} is empty/undefined, removes the placeholder and any trailing underscore/hyphen
 */
export function resolveFilename(template: string, vars: FilenameVars): string {
  let result = template;

  // Handle {project} specially - remove trailing separator if empty
  if (vars.project) {
    result = result.replace('{project}', vars.project);
  } else {
    // Remove {project} and any immediately following underscore or hyphen
    result = result.replace(/\{project\}[_-]?/, '');
  }

  if (vars.year !== undefined) {
    result = result.replace('{year}', String(vars.year));
  }
  if (vars.quarter !== undefined) {
    result = result.replace('{quarter}', String(vars.quarter));
  }
  if (vars.week !== undefined) {
    result = result.replace('{week}', vars.week);
  }
  if (vars.date !== undefined) {
    result = result.replace('{date}', vars.date);
  }

  return result;
}
