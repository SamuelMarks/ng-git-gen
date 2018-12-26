import { Command } from '@oclif/command';

import { existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import * as http from 'http';
import { ClientRequestArgs } from 'http';
import * as https from 'https';
import * as path from 'path';
import { parse } from 'url';

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

export const downloadAndRef = (gen_dir: string, url: string): Promise<string> => new Promise((resolve, reject) => {
        if (!url.startsWith('http')) return resolve(url);

        const fname = url.slice(url.lastIndexOf('/') + 1);
        const full_path = path.join(gen_dir, fname);

        console.info('fname:', fname, ';\nfull_path:', full_path, ';\nurl:', url, ';');

        try {
            if (existsSync(full_path)) // Sync variants, which aren't deprecated as opposed to `exists`
                unlinkSync(full_path);
        } catch (e) {
            return reject(e);
        }

        const options: ClientRequestArgs = parse(url);
        options.headers = {
            'User-Agent': 'request'
        };

        (url.startsWith('https') ? https : http)
            .get(options, res => {
                const { statusCode } = res;
                if (statusCode !== 200) {
                    // consume response data to free up memory
                    res.resume();
                    return reject(new Error(`Request Failed.\nStatus Code: ${statusCode}`));
                }

                const encoding = 'utf8';
                res.setEncoding(encoding);
                res.on('data', chunk => writeFileSync(full_path, chunk, { encoding, flag: 'a' }));
                res.on('end', () => resolve(`./${fname}`));
            })
            .on('error', reject);
    }
);

export const length_else_0 = (something: any): number =>
    something == null ? 0 : (something.length ? something.length : 0);
