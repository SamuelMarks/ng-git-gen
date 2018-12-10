import { exec } from 'child_process';
import * as fs from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';

import * as git from 'isomorphic-git';
import { walkSync } from './utils';

git.plugins.set('fs', fs);

export type Fname2Content = Map<string, string>;

export const acquireGithubWiki = (ext: string, url: string, to_dir: string | undefined,
                                  bootstrap: string | undefined): Promise<Fname2Content> => {
    const dir: string = to_dir || path.join(tmpdir(), url.slice(url.lastIndexOf('/') + 1));
    return new Promise((resolve, reject) =>
        git
            .clone({
                dir, url,
                corsProxy: 'https://cors.isomorphic-git.org',
                ref: 'master',
                singleBranch: true,
                depth: 10
            })
            .then(() => new Promise((res, rej) =>
                bootstrap == null || !bootstrap.length ? res() :
                    exec(bootstrap as string, { cwd: dir }, (err, stdout, stderr) =>
                        err == null
                            ? process.stdout.write(stdout) && process.stderr.write(stderr) && res()
                            : rej(err)))
                .then(() => {
                    const fname2content: Fname2Content = new Map();
                    try {
                        for (const fname of walkSync(dir))
                            if (fname.endsWith(ext)
                                && fname.indexOf(`${path.sep}.github${path.sep}`) === -1
                                && fname.indexOf(`${path.sep}.git${path.sep}`) === -1)
                                fname2content.set(fname.replace(`${dir}${path.sep}`, ''),
                                    fs.readFileSync(fname, { encoding: 'utf8' }));
                    } catch (e) {
                        reject(e);
                    }
                    return resolve(fname2content);
                })
                .catch(reject)
            )
            .catch(reject)
    );
};
