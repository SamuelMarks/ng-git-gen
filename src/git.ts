import { exec } from 'child_process';
import * as fs from 'fs';
import { WriteFileOptions, writeFileSync } from 'fs';
import * as path from 'path';

import * as git from 'isomorphic-git';
import { camelCaseToDash, ensure_quoted, fnameSanitise, slugify, walkSync } from './utils';
import { Routes } from '@angular/router';
import { component_gen, component_gen_tpl_url, module_gen, routes_gen } from './generators';
import { Type } from '@angular/core';
import { OutputFlags } from '@oclif/parser';

git.plugins.set('fs', fs);

export type Fname2Content = Map<string, string>;

// TODO: Split `boostrap` into its own function
export const acquireGitRepo = (ext: string, url: string, to_dir: string,
                               bootstrap: string | undefined): Promise<Fname2Content> => {
    return new Promise((resolve, reject) =>
        git
            .clone({
                dir: to_dir, url,
                corsProxy: 'https://cors.isomorphic-git.org',
                ref: 'master',
                singleBranch: true,
                depth: 10
            })
            .then(() => new Promise((res, rej) =>
                bootstrap == null || !bootstrap.length ? res() :
                    exec(bootstrap as string, { cwd: to_dir }, (err, stdout, stderr) =>
                        err == null
                            ? process.stdout.write(stdout) && process.stderr.write(stderr) && res()
                            : rej(err)))
                .then(() => {
                    const fname2content: Fname2Content = new Map();
                    try {
                        for (const fname of walkSync(to_dir))
                            if (fname.endsWith(ext)
                                && fname.indexOf(`${path.sep}.github${path.sep}`) === -1
                                && fname.indexOf(`${path.sep}.git${path.sep}`) === -1)
                                fname2content.set(fname.replace(`${to_dir}${path.sep}`, ''),
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

export const ngGitProcessor = (flags: OutputFlags<any>,
                               maybe_log: (content: any, msg?: string, level?: number) => typeof content,
                               gen: string, ng_prefix: string) =>
    (fname2content: Fname2Content): Promise<void> => new Promise((resolve, reject) => {
        const write_options: WriteFileOptions = { encoding: 'utf8', flag: 'w' };

        if (!fname2content.size) {
            maybe_log('Empty fname2content... will still generate' +
                `${flags.list_route ? ' list Component and' : ''} Module`, '');
            return resolve();
        }
        const routes: Routes = [];
        const declarations: string[] = [];

        try {
            for (const [fname, content] of fname2content.entries()) {
                const _path = fnameSanitise(fname.slice(0, fname.lastIndexOf('.')));
                const cname = _path.replace('/', '-');

                const class_name = `${cname[0].toUpperCase() + cname.slice(1).replace(/-([a-z])/g,
                    (x, up) => up.toUpperCase())}`
                    + 'Component';
                const tpl_fname = `${cname}.component.html`;
                writeFileSync(maybe_log(path.join(gen, `${cname}.component.ts`)),
                    component_gen_tpl_url(ng_prefix, cname, `./${tpl_fname}`,
                        void 0, class_name), write_options);
                const processed_content = flags.postprocess_content == null ? content
                    : Function(`return \`${content}\`${flags.postprocess_content}`)();
                writeFileSync(maybe_log(path.join(gen, tpl_fname)), processed_content, write_options);
                declarations.push(class_name);

                routes.push({
                    path: ensure_quoted(slugify(fnameSanitise(fname.slice(0, fname.lastIndexOf('.'))))),
                    component: class_name as any as Type<any>
                });
            }
        } catch (e) {
            console.error(e.message, e.stack);
            // process.exit(2);
            return reject(e);
        }

        const className = 'ListComponent';
        const name = 'list';
        const template = '<ul>' +
            routes.map(route =>
                '<li>' +
                '<a routerLink=' + route.path + '>' +
                (route.path as string).substr(1, (route.path as string).length - 2) + '</a>' +
                '</li>').join('') +
            '</ul>';

        try {
            writeFileSync(path.join(gen, `${name}.component.ts`), component_gen(ng_prefix, name, template,
                void 0, className), write_options);
            declarations.push(className);

            routes.push({
                path: '\'\'',
                component: className as any as Type<any>
            });

            const component_imports = declarations.map(
                s => `import { ${s} } from './${camelCaseToDash(s).replace('-component', '.component')}';`
            );

            writeFileSync(maybe_log(path.join(gen, 'generated.routes.ts')),
                routes_gen(component_imports, routes, 'generatedRoutes'),
                write_options);
            writeFileSync(maybe_log(path.join(gen, 'generated.module.ts')),
                module_gen(
                    component_imports, flags.extra_imports || [],
                    declarations, 'GeneratedModule'
                ),
                write_options);
            return resolve();
        } catch (e) {
            return reject(e);
        }
    });
