import { exec } from 'child_process';
import * as fs from 'fs';
import { WriteFileOptions, writeFileSync } from 'fs';
import * as path from 'path';

import * as git from 'isomorphic-git';

import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { OutputFlags } from '@oclif/parser';

import { component_gen, component_gen_tpl_url_styles_url, module_gen, routes_gen } from './generators';
import { camelCaseToDash, downloadAndRef, ensure_quoted, fnameSanitise, slugify, walkSync } from './utils';

git.plugins.set('fs', fs);

export type Fname2Content = Map<string, string>;

// TODO: Split `bootsrap` into its own function
export const acquireGitRepo = (ext: string, url: string, to_dir: string,
                               bootstrap: string | undefined): Promise<Fname2Content> => new Promise(
    (resolve, reject) =>
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

export const ngGitProcessor = (flags: OutputFlags<any>,
                               maybe_log: (content: any, msg?: string, level?: number) => typeof content,
                               gen_dir: string, ng_prefix: string, output_ext: string,
                               styleUrls: string[] | undefined) =>
    (fname2content: Fname2Content): Promise<void> => new Promise((resolve, reject) => {
            const write_options: WriteFileOptions = { encoding: 'utf8', flag: 'w' };

            if (!fname2content.size) {
                maybe_log('Empty fname2content... will still generate' +
                    `${flags.list_route ? ' list Component and' : ''} Module`, '');
                return resolve();
            }
            const routes: Routes = [];
            const declarations: string[] = [];


            const generateModuleAndComponents = () => new Promise((res, rej) => {
                try {
                    for (const [fname, content] of fname2content.entries()) {
                        const _path = fnameSanitise(fname.slice(0, fname.lastIndexOf('.')));
                        const cname = _path.replace('/', '-');

                        const class_name = `${cname[0].toUpperCase() + cname.slice(1).replace(/-([a-z])/g,
                            (x, up) => up.toUpperCase())}`
                            + 'Component';
                        const tpl_fname = `${cname}.component${output_ext}`;
                        const componentHeader = `// templateUrl: './${tpl_fname}'`;

                        writeFileSync(maybe_log(path.join(gen_dir, `${cname}.component.ts`)),
                            component_gen_tpl_url_styles_url(componentHeader, ng_prefix, cname,
                                `./${tpl_fname.replace(output_ext, '.html')}`,
                                styleUrls, class_name),
                            write_options);

                        /* tslint:disable:function-constructor */
                        const processed_content = flags.postprocess_content == null ? content
                            : Function(`return \`${content}\`${flags.postprocess_content}`)();
                        writeFileSync(maybe_log(path.join(gen_dir, tpl_fname)), processed_content, write_options);
                        declarations.push(class_name);

                        routes.push({
                            path: ensure_quoted(slugify(fnameSanitise(fname.slice(0, fname.lastIndexOf('.'))))),
                            component: class_name as any as Type<any>
                        });
                    }
                    res();
                } catch (e) {
                    /* tslint:disable:no-console */
                    console.error(e.message, e.stack);
                    // process.exit(2);
                    return rej(e);
                }
            });

            const generateListComponent = () => new Promise((res, rej) => {
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
                    writeFileSync(path.join(gen_dir, `${name}.component.ts`),
                        component_gen(ng_prefix, name, template, void 0, className),
                        write_options);
                    declarations.push(className);

                    routes.push({
                        path: '\'\'',
                        component: className as any as Type<any>
                    });

                    const component_imports = declarations
                        .map(s => `import { ${s} } from './${camelCaseToDash(s).split('').reverse().join('')
                            .replace('tnenopmoc-', 'tnenopmoc.').split('').reverse().join('')}';`
                        );

                    writeFileSync(maybe_log(path.join(gen_dir, 'generated.routes.ts')),
                        routes_gen(component_imports, routes, 'generatedRoutes'),
                        write_options);
                    writeFileSync(maybe_log(path.join(gen_dir, 'generated.module.ts')),
                        module_gen(component_imports, flags.extra_imports || [], declarations, 'GeneratedModule'),
                        write_options);
                    return res();
                } catch (e) {
                    return rej(e);
                }
            });

            if (styleUrls != null && styleUrls.length) {
                for (let i = 0; i < styleUrls.length; i++)
                    downloadAndRef(gen_dir, styleUrls[i])
                        .then(styleUrl => styleUrls[i] = styleUrl)
                        .catch(reject);
            }

            generateModuleAndComponents()
                .then(() => generateListComponent()
                    .then(() => resolve())
                    .catch(reject))
                .catch(reject);
        }
    );
