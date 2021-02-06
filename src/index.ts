import {Command, flags} from '@oclif/command'
import {existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync} from 'fs'
import {tmpdir} from 'os'
import * as path from 'path'

import {updateGlobalRoutes} from './angular'
import {acquireGitRepo, ngGitProcessor} from './git'
import {length_else_0, log_if_verbose} from './utils'

class NgGitGen extends Command {
  static description = 'Generates Angular (Module, Components and Routes) from static files in a git repo'

  static flags = {
    version: flags.version(),
    help: flags.help({char: 'h'}),

    // Debugging
    verbosity: flags.string({char: 'v', description: 'verbosity', multiple: true}),

    // Basic config
    project_dir: flags.string({char: 'p', description: 'angular project dir', required: true}),
    ng_project_name: flags.string({description: 'angular project name, defaults to first in angular.json'}),

    // git
    git_url: flags.string({char: 'g', description: 'Git URL to use markdown from', required: true}),
    git_dir: flags.string({char: 'd', description: '[default: tmp] Directory to clone git repo into'}),

    // Module
    global_route: flags.boolean({
      char: 'R', description: '[default: false] Lazy route in app-routing',
      default: false,
    }),
    global_route_mount: flags.string({
      char: 'm', description: '[default: Value of route flag] If --global-route',
    }),
    extra_imports: flags.string({
      char: 'i', multiple: true,
      description: 'Example: \'import {Foo} from bar;\' will add this line, and `Foo` to `imports: []` in Module',
    }),

    // Global
    route: flags.string({char: 'r', description: 'Route, e.g.: /wiki', default: 'wiki'}),

    // General config
    ext: flags.string({char: 'e', description: 'Extension, e.g.: \'.md\'', default: '.md'}),
    output_ext: flags.string({char: 'o', description: 'Output extension', default: '.html'}),

    // Additional commands to execute
    bootstrap: flags.string({char: 'b', description: 'Execute this before collecting files with extension'}),
    afterstrap: flags.string({char: 'a', description: 'Execute this on the content strings'}),
    postprocess_content: flags.string({
      char: 'f',
      description: 'Function to run on content before conclusion, e.g.: replace("fo", "ba").replace("ca","ha"})',
    }),

    // Component config
    list_route: flags.boolean({
      char: 'l', description: '[default: true] Generate root route, listing all wiki links',
      default: true,
    }),
    download: flags.string({
      multiple: true, description: 'Alternative to styleUrls syntax, places file in `generated` dir',
    }),
    styleUrls: flags.string({
      char: 's', multiple: true,
      description: 'styleUrls, if starts with http, then will download to generated dir & update styleUrl to this',
    }),
    lifecycle: flags.string({
      multiple: true,
      description: 'Add lifecycle to component,'
        + 'e.g.: `--lifecycle AfterViewInit'
        + ' --lifecycle_init \'console.info("AfterViewInit"); throw Error("WOW")\'',
    }),
    lifecycle_init: flags.string({
      multiple: true,
      description: 'Add lifecycle init to component. See `--lifecycle` for example.',
    }),
  }

  static args = [{name: 'file'}]

  async run() {
    /* tslint:disable:no-shadowed-variable */
    const {args, flags} = this.parse(NgGitGen)

    const verbosity = flags.verbosity == null ? 0 : flags.verbosity.length
    const maybe_log = log_if_verbose(this.log.bind(this), verbosity)

    const angular_json = require(path.join(flags.project_dir, 'angular.json'))
    const ng_project_name = flags.ng_project_name ? flags.ng_project_name
      : Object.keys(angular_json['projects'])[0]
    const ng_prefix = angular_json['projects'][ng_project_name]['prefix']
    const gen_grandparent = path.join(
      flags.project_dir, angular_json['projects'][ng_project_name]['sourceRoot'],
      ng_prefix)
    const gen_parent = path.join(gen_grandparent, flags.route as string)
    const gen_dir = path.join(gen_parent, 'generated')

    /* tslint:disable:no-bitwise */
    if (length_else_0(flags.lifecycle) + length_else_0(flags.lifecycle_init) as number & 1 === 1) {
      throw new TypeError('`--lifecycle` and `--lifecycle-init` must be mentioned same number of times')
    }

    flags.git_dir = flags.git_dir || path.join(tmpdir(), flags.git_url.slice(flags.git_url.lastIndexOf('/') + 1))

    maybe_log(flags.git_dir, 'Cloning to:\t')

    /* tslint:disable:no-unused-expression */
    if (existsSync(maybe_log(gen_dir, 'Removing:\t')))
      readdirSync(gen_dir)
        .forEach(fname => unlinkSync(path.join(gen_dir, fname))) as any || rmdirSync(gen_dir)
    else if (!existsSync(gen_parent)) mkdirSync(gen_parent)
    mkdirSync(gen_dir)

    acquireGitRepo(flags.ext as string, flags.git_url, flags.git_dir as string, flags.bootstrap)
      .then(ngGitProcessor(flags, maybe_log, gen_dir, ng_prefix))
      .then(() => updateGlobalRoutes(gen_grandparent, flags.global_route,
        flags.global_route_mount as any || flags.route))
      .catch((e: Error) => {
        throw e
      })
  }
}

export = NgGitGen
