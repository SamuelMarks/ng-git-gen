import { Command } from '@oclif/command';
import { readdirSync, statSync } from 'fs';
import * as path from 'path';


export const fnameSanitise = (fname: string): string =>
    fname
        .toLocaleLowerCase()
        .replace(' ', '-')
        .replace(path.sep, '/');

export const stringify = (obj_from_json: object | any[]): string => {
    if (typeof obj_from_json !== 'object' || Array.isArray(obj_from_json)) {
        // not an object, stringify using native function
        return JSON.stringify(obj_from_json);
    }
    // Implements recursive object serialization according to JSON spec
    // but without quotes around the keys.
    const props = Object
        .keys(obj_from_json)
        .map(key => `${key}:${stringify((obj_from_json as any)[key])}`)
        .join(',');
    return `{${props}}`;
};

export const ensure_quoted = (s: string, q = '\''): string => s == null || !s.length ? s
    : (s.startsWith('"') && s.endsWith('"') || s.startsWith('\'') && s.endsWith('\'') ? s : `${q}${s}${q}`);

// https://gist.github.com/youssman/745578062609e8acac9f#gistcomment-2304728
export const camelCaseToDash = (s: string): string => s.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();

export const slugify = (s: string): string =>
    s
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-')   // Replace multiple - with single -
        .replace(/^-+/, '')       // Trim - from start of text
        .replace(/-+$/, '');

export function* walkSync(dir: string): IterableIterator<string> {
    const files = readdirSync(dir);

    for (const file of files) {
        const pathToFile = path.join(dir, file);
        const isDirectory = statSync(pathToFile).isDirectory();
        if (isDirectory)
            yield* walkSync(pathToFile);
        else
            yield pathToFile;
    }
}

export const log_if_verbose = (debug: Command['debug'], verbosity: number) =>
    (content: any, msg = 'Generated:\t', gt_level = 0): typeof content =>
        verbosity > gt_level && debug(`${msg} ${content}`) || content;
