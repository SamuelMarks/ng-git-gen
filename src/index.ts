import { Command, flags } from '@oclif/command';

import { existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync, WriteFileOptions, writeFileSync } from 'fs';
import * as path from 'path';

import { Type } from '@angular/core';
import { Routes } from '@angular/router';

import { component_gen, component_gen_tpl_url, module_gen, routes_gen } from './generators';
import { acquireGithubWiki } from './git';
import { camelCaseToDash, ensure_quoted, fnameSanitise, slugify } from './utils';

class NgGithubWikiGen extends Command {
    static description = 'Generates Module, Components and Routes for Github Wiki integration with Angular.';

    static flags = {
        version: flags.version({ char: 'v' }),
        help: flags.help({ char: 'h' }),
        project_dir: flags.string({ char: 'p', description: 'angular project dir', required: true }),
        ng_project_name: flags.string({ description: 'angular project name, defaults to first in angular.json' }),
        git_url: flags.string({ char: 'g', description: 'Git URL to use markdown from', required: true }),
        list_route: flags.boolean({
            char: 'l', description: '[default: true] Generate root route, listing all wiki links',
            default: true
        }),
        route: flags.string({ char: 'r', description: 'Route, e.g.: /wiki', default: 'wiki' }),
        ext: flags.string({ char: 'e', description: 'Extension, e.g.: \'.md\'', default: '.md' }),
        bootstrap: flags.string({ char: 'b', description: 'Execute this before collecting files with extension' }),
        afterstrap: flags.string({ char: 'a', description: 'Execute this on the content strings' })
    };

    async run() {
        /* tslint:disable:no-shadowed-variable */
        const { args, flags } = this.parse(NgGithubWikiGen);

        const write_options: WriteFileOptions = { encoding: 'utf8', flag: 'w' };

        const angular_json = require(path.join(flags.project_dir, 'angular.json'));
        const ng_project_name = flags.ng_project_name ? flags.ng_project_name
            : Object.keys(angular_json['projects'])[0];
        const ng_prefix = angular_json['projects'][ng_project_name]['prefix'];
        const gen_par = path.join(
            flags.project_dir, angular_json['projects'][ng_project_name]['sourceRoot'],
            ng_prefix, flags.route as string);
        const gen = path.join(
            flags.project_dir, angular_json['projects'][ng_project_name]['sourceRoot'],
            ng_prefix, flags.route as string, 'generated'
        );

        /* tslint:disable:no-unused-expression */
        if (existsSync(gen))
            readdirSync(gen).forEach(fname => unlinkSync(path.join(gen, fname))) as any || rmdirSync(gen);
        else if (!existsSync(gen_par)) mkdirSync(gen_par);
        mkdirSync(gen);
        acquireGithubWiki(flags.ext as string, flags.git_url, void 0, flags.bootstrap)
            .then(fname2content => {
                if (fname2content == null) throw ReferenceError('Empty fname2content');

                console.info('fname2content:', fname2content, ';');

                const routes: Routes = [];
                const declarations: string[] = [];
                for (const [fname, content] of fname2content.entries()) {
                    const _path = fnameSanitise(fname.slice(0, fname.lastIndexOf('.')));
                    const cname = _path.replace('/', '-');

                    const class_name = `${cname[0].toUpperCase() + cname.slice(1).replace(/-([a-z])/g,
                        (x, up) => up.toUpperCase())}`
                        + 'Component';
                    const tpl_fname = `${cname}.component.html`;
                    writeFileSync(path.join(gen, `${cname}.component.ts`),
                        component_gen_tpl_url(ng_prefix, cname, `./${tpl_fname}`, void 0, class_name), write_options);
                    writeFileSync(path.join(gen, tpl_fname), content, write_options);
                    declarations.push(class_name);

                    routes.push({
                        path: ensure_quoted(slugify(fnameSanitise(fname.slice(0, fname.lastIndexOf('.'))))),
                        component: class_name as any as Type<any>
                    });
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

                writeFileSync(path.join(gen, 'generated.routes.ts'),
                    routes_gen(component_imports, routes, 'generatedRoutes'),
                    write_options);

                writeFileSync(path.join(gen, 'generated.module.ts'),
                    module_gen(
                        component_imports,
                        declarations, 'GeneratedModule'
                    ),
                    write_options);
            })
            .catch(e => {
                throw e;
            });
    }
}

export = NgGithubWikiGen;
