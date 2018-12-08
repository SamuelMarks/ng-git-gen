import { exec } from 'child_process';
import * as fs from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';

import * as git from 'isomorphic-git';

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
                bootstrap == null || !bootstrap.length ? resolve() :
                    exec(bootstrap as string, { cwd: dir }, (err, stdout, stderr) =>
                        err == null
                            ? process.stdout.write(stdout) && process.stderr.write(stderr) && res()
                            : rej(err)))
                .then(() => git
                    .listFiles({ fs, dir })
                    .then((files: string[]) => resolve(
                        new Map<string, string>(files
                            .filter((fname: string) => fname.endsWith(ext) && !fname.startsWith(`.github${path.sep}`))
                            .map((fname: string) => [
                                fname, fs.readFileSync(path.join(dir, fname), { encoding: 'utf8' })
                            ]) as any
                        ))
                    )
                    .catch(reject))));
};
