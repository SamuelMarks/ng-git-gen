import {Type} from '@angular/core'
import {Routes} from '@angular/router'
import {OutputFlags} from '@oclif/parser'

import * as async_ from 'async'
import {ErrorCallback} from 'async'
import {exec} from 'child_process'
import * as fs from 'fs'
import {writeFileSync} from 'fs'

import {clone} from 'isomorphic-git'
import * as http from 'isomorphic-git/http/node'
import * as path from 'path'

import {component_gen, component_gen_with_urls, module_gen, routes_gen} from './generators'
import {
  camelCaseToDash,
  default_write_opts,
  downloadAndRef,
  encoding,
  ensure_quoted,
  fnameSanitise,
  slugify,
  walkSync,
} from './utils'
import NgGitGen = require('./index')

export type Fname2Content = Map<string, string>;

// `bootstrap` should be splitE into its own function
export const acquireGitRepo = (ext: string, url: string, to_dir: string,
  bootstrap: string | undefined): Promise<Fname2Content> => new Promise(
  (resolve, reject) =>
    clone({
      fs,
      http,
      dir: to_dir, url,
      corsProxy: 'https://cors.isomorphic-git.org',
      ref: 'master',
      singleBranch: true,
      depth: 10,
    })
    .then(() => new Promise((res, rej) =>
      bootstrap == null || bootstrap.length === 0 ? res(void 0) :
        exec(bootstrap as string, {cwd: to_dir}, (err, stdout, stderr) =>
          err == null ?
            process.stdout.write(stdout) && process.stderr.write(stderr) && res(void 0) :
            rej(err)))
    .then(() => {
      const fname2content: Fname2Content = new Map()
      try {
        for (const fname of walkSync(to_dir))
          if (fname.endsWith(ext) &&
                fname.indexOf(`${path.sep}.github${path.sep}`) === -1 &&
                fname.indexOf(`${path.sep}.git${path.sep}`) === -1)
            fname2content.set(fname.replace(`${to_dir}${path.sep}`, ''),
              fs.readFileSync(fname, {encoding}))
      } catch (error) {
        reject(error)
      }
      return resolve(fname2content)
    })
    .catch(reject),
    )
    .catch(reject),
)

export const ngGitProcessor = (flags: OutputFlags<typeof NgGitGen.flags>,
  maybe_log: (content: any, msg?: string, level?: number) => typeof content,
  gen_dir: string, ng_prefix: string) => (fname2content: Fname2Content): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!fname2content.size) {
      maybe_log('Empty fname2content... will still generate' +
          `${flags.list_route ? ' list Component and' : ''} Module`, '')
      return resolve()
    }
    const routes: Routes = []
    const declarations: string[] = []

    const generateModuleAndComponents = () => new Promise((res, rej) => {
      try {
        for (const [fname, content] of fname2content.entries()) {
          const _path = fnameSanitise(fname.slice(0, fname.lastIndexOf('.')))
          const cname = _path.replace('/', '-')

          const class_name = `${cname[0].toUpperCase() + cname.slice(1).replace(/-([a-z])/g,
            (x, up) => up.toUpperCase())}` +
              'Component'
          const tpl_fname = `${cname}.component${flags.output_ext}`
          const componentHeader = `// templateUrl: './${tpl_fname}'`

          const lifecycles = new Map<string, string>(
            flags.lifecycle != null && flags.lifecycle.length > 0 ?
                flags.lifecycle.map((x: string, i: number) => [x, flags.lifecycle_init[i]]) as any :
              void 0)

          writeFileSync(maybe_log(path.join(gen_dir, `${cname}.component.ts`)),
            component_gen_with_urls(componentHeader, ng_prefix, cname,
              `./${tpl_fname.replace(flags.output_ext, '.html')}`,
              flags.styleUrls, /* flags.lifecycle */lifecycles, class_name),
            default_write_opts)

          const processed_content = flags.postprocess_content == null ? content :
            // eslint-disable-next-line no-new-func
            new Function(`return \`${content}\`${flags.postprocess_content}`)()
          writeFileSync(maybe_log(path.join(gen_dir, tpl_fname)), processed_content, default_write_opts)
          declarations.push(class_name)

          routes.push({
            path: ensure_quoted(slugify(fnameSanitise(fname.slice(0, fname.lastIndexOf('.'))))),
            component: class_name as any as Type<any>,
          })
        }
        res(void 0)
      } catch (error) {
        /* tslint:disable:no-console */
        console.error(error.message, error.stack)
        // process.exit(2);
        return rej(error)
      }
    })

    const generateListComponent = () => new Promise((res, rej) => {
      const className = 'ListComponent'
      const name = 'list'
      const template = '<ul>' +
          routes.map(route =>
            '<li>' +
            '<a routerLink=' + route.path + '>' +
            (route.path as string).substr(1, (route.path as string).length - 2) + '</a>' +
            '</li>').join('') +
          '</ul>'

      try {
        writeFileSync(path.join(gen_dir, `${name}.component.ts`),
          component_gen(ng_prefix, name, template, void 0, className),
          default_write_opts)
        declarations.push(className)

        routes.push({
          path: '\'\'',
          component: className as any as Type<any>,
        })

        const component_imports = declarations
        .map(s => `import { ${s} } from './${camelCaseToDash(s).split('').reverse().join('')
        .replace('tnenopmoc-', 'tnenopmoc.').split('').reverse().join('')}';`,
        )

        writeFileSync(maybe_log(path.join(gen_dir, 'generated.routes.ts')),
          routes_gen(component_imports, routes, 'generatedRoutes'),
          default_write_opts)
        writeFileSync(maybe_log(path.join(gen_dir, 'generated.module.ts')),
          module_gen(component_imports, flags.extra_imports || [], declarations, 'GeneratedModule'),
          default_write_opts)
        return res(void 0)
      } catch (error) {
        return rej(error)
      }
    })

    const styleUrlsHandler = (cb: ErrorCallback<Error>) => flags.styleUrls != null && flags.styleUrls.length > 0 ?
      async_.forEachOf(
        flags.styleUrls, (_, i, callback) => {
          downloadAndRef(gen_dir, flags.styleUrls[i as number])
          .then(styleUrl => {
            flags.styleUrls[i as number] = styleUrl
            return callback()
          })
          .catch(callback)
        }, cb,
      ) :
      cb(void 0)

    const downloadHandler = (cb: ErrorCallback<Error>) => flags.download != null && flags.download.length > 0 ?
      async_.map(flags.download,
        (url, callb) =>
          downloadAndRef(gen_dir, url as string).then(() => callb()).catch(callb),
        e => cb(e),
      ) :
      cb()

    styleUrlsHandler(error => {
      if (error != null) return reject(error)
      downloadHandler(err => {
        if (err != null) return reject(err)
        generateModuleAndComponents()
        .then(() => generateListComponent()
        .then(() => resolve())
        .catch(reject))
        .catch(reject)
      })
    })
  },
  )
