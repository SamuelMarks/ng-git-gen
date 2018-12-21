import { Command, flags } from '@oclif/command';

import { existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { acquireGitRepo, ngGitProcessor } from './git';
import { log_if_verbose } from './utils';
import { updateGlobalRoutes } from './angular';

class NgGithubWikiGen extends Command {
    static description = 'Generates Module, Components and Routes for Github Wiki integration with Angular.';

    static flags = {
        version: flags.version(),
        help: flags.help({ char: 'h' }),
        project_dir: flags.string({ char: 'p', description: 'angular project dir', required: true }),
        ng_project_name: flags.string({ description: 'angular project name, defaults to first in angular.json' }),
        git_url: flags.string({ char: 'g', description: 'Git URL to use markdown from', required: true }),
        git_dir: flags.string({ char: 'd', description: '[default: tmp] Directory to clone git repo into' }),
        list_route: flags.boolean({
            char: 'l', description: '[default: true] Generate root route, listing all wiki links',
            default: true
        }),
        global_route: flags.boolean({
            char: 'R', description: '[default: false] Lazy route in app-routing',
            default: false
        }),
        global_route_mount: flags.string({
            char: 'm', description: '[default: Value of route flag] If --global-route'
        }),
        route: flags.string({ char: 'r', description: 'Route, e.g.: /wiki', default: 'wiki' }),
        ext: flags.string({ char: 'e', description: 'Extension, e.g.: \'.md\'', default: '.md' }),
        bootstrap: flags.string({ char: 'b', description: 'Execute this before collecting files with extension' }),
        afterstrap: flags.string({ char: 'a', description: 'Execute this on the content strings' }),
        verbosity: flags.string({ char: 'v', description: 'verbosity', multiple: true }),
        extra_imports: flags.string({
            char: 'i', multiple: true,
            description: 'Example: \'import {Foo} from bar;\' will add this line, and `Foo` to `imports: []` in Module'
        }),
        postprocess_content: flags.string({
            char: 'f',
            description: 'Function to run on content before conclusion, e.g.: replace("fo", "ba").replace("ca","ha"})'
        })
    };

    async run() {
        /* tslint:disable:no-shadowed-variable */
        const { args, flags } = this.parse(NgGithubWikiGen);

        const verbosity = flags.verbosity == null ? 0 : flags.verbosity.length;
        const maybe_log = log_if_verbose(this.log.bind(this), verbosity);

        const angular_json = require(path.join(flags.project_dir, 'angular.json'));
        const ng_project_name = flags.ng_project_name ? flags.ng_project_name
            : Object.keys(angular_json['projects'])[0];
        const ng_prefix = angular_json['projects'][ng_project_name]['prefix'];
        const gen_grandparent = path.join(
            flags.project_dir, angular_json['projects'][ng_project_name]['sourceRoot'],
            ng_prefix);
        const gen_parent = path.join(gen_grandparent, flags.route as string);
        const gen = path.join(gen_parent, 'generated');

        flags.git_dir = flags.git_dir || path.join(tmpdir(), flags.git_url.slice(flags.git_url.lastIndexOf('/') + 1));
        maybe_log(flags.git_dir, 'Cloning to:\t');

        /* tslint:disable:no-unused-expression */
        if (existsSync(maybe_log(gen, 'Removing:\t')))
            readdirSync(gen)
                .forEach(fname => unlinkSync(path.join(gen, fname))) as any || rmdirSync(gen);
        else if (!existsSync(gen_parent)) mkdirSync(gen_parent);
        mkdirSync(gen);

        acquireGitRepo(flags.ext as string, flags.git_url, flags.git_dir, flags.bootstrap)
            .then(ngGitProcessor(flags, maybe_log, gen, ng_prefix))
            .then(() => updateGlobalRoutes(gen_grandparent, flags.global_route,
                flags.global_route_mount as any || flags.route))
            .catch((e: Error) => {
                throw e;
            });
    }
}

export = NgGithubWikiGen;
