import * as assert from 'assert'
import {execSync} from 'child_process'
import {existsSync, lstatSync, readdirSync, rmdirSync, unlinkSync} from 'fs'
import * as path from 'path'
import cmd = require('../src')

const deleteFolderRecursive = (p: string) => {
  if (existsSync(p)) {
    readdirSync(p).forEach((file) => {
      const curPath = path.join(p, file)
      if (lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath)
      } else { // delete file
        unlinkSync(curPath)
      }
    })
    rmdirSync(p)
  }
}

describe('ng-git-gen', () => {
  const project_name = 'ng-test'
  const project_dir = path.join(__dirname, project_name)

  const removeNgProject = (done: (error?: Error) => void) => done()
  // existsSync(project_dir) ? rmrf(project_dir, { glob: false }, done) : done();

  before('remove ng-test', () => {
    deleteFolderRecursive(project_dir)
  })

  beforeEach('create ng project', done => removeNgProject(e => {
    if (e != null) return done(e)

    execSync('ng new ' +
      '--routing --interactive=false ' +
      '--skip-install ' +
      '--skip-tests ' +
      '--skip-git ' +
      '-st ' +
      `--directory '${path.join('test', project_name)}' '${project_name}'`)

    return done(void 0)
  }))

  after(done => removeNgProject(done))

  const confirmBaseModuleAndRoute = (route_name: string, cb: (error?: Error) => void) => {
    setTimeout(() => {
      const route_dir = path.join(project_dir, 'src', 'app', route_name)
      const gen_dir = path.join(route_dir, 'generated')

      if (!existsSync(route_dir))
        return cb(new assert.AssertionError({message: `'${route_dir}' not found`}))
      else if (!existsSync(gen_dir))
        return cb(new assert.AssertionError({message: `'${gen_dir}' not found`}))

      for (const fname of ['generated.module.ts', 'generated.routes.ts']) {
        const full_path = path.join(gen_dir, fname)
        if (!existsSync(full_path))
          return cb(new assert.AssertionError(
            {message: `'${fname}' not found in '${gen_dir} ['${full_path}']`},
          ))
      }
      return cb()
    }, 3000)
  }

  const list_component = (route_name: string): string =>
    path.join(project_dir, 'src', 'app', route_name, 'list.component.ts')

  const base_cli_args = [
    '--project_dir', project_dir,
    '-g', 'https://github.com/Fantom-foundation/fantom-dev-web.wiki.git',
  ]

  const test0 = '--project_dir -g'
  it(test0, done => {
    const route_name = 'wiki'
    cmd
      .run(base_cli_args)
      .then(() => {
        confirmBaseModuleAndRoute(route_name, e => {
          if (e != null) return done(e)
          const wiki_list_component = list_component(route_name)
          if (existsSync(wiki_list_component))
            return done(new assert.AssertionError(
              {message: `'${wiki_list_component}' should not exist`},
            ))
          return done()
        })
      })
  })

  /*const test1 = '--project_dir -g -l';
  it(test1, () => {
    test
      .stdout()
      .do(() => cmd.run([...base_cli_args, '-l']))
      .it(test1, ctx => {
        expect(ctx.stdout).to.be.eql('');
        confirmBaseModuleAndRoute('wiki');
        const wiki_list_component = list_component('wiki');
        if (!existsSync(wiki_list_component))
          throw new assert.AssertionError({ message: `'${wiki_list_component}' not found` });
      });
  });

  const test2 = '--project_dir -g -vv';
  it(test2, () => {
    test
      .stdout()
      .do(() => cmd.run([...base_cli_args, '-vv']))
      .it(test2, ctx => {
        expect(ctx.stdout).to.be.eql('');
        confirmBaseModuleAndRoute('wiki');
        const wiki_list_component = list_component('wiki');
        if (!existsSync(wiki_list_component))
          throw new assert.AssertionError({ message: `'${wiki_list_component}' not found` });
      });
  });*/
})
