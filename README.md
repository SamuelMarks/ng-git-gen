ng-git-gen
==================

Generates Angular (Module, Components and Routes) from static files in a git repo.

Originally for Github Wiki integration.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)

# Install

    npm i -g ng-git-gen

# Usage

    $ ng-git-gen --help
    
    OPTIONS
      -b, --bootstrap=bootstrap          Execute this before collecting files with extension
      -e, --ext=ext                      [default: .md] Extension, e.g.: '.md'
      -g, --git_url=git_url              (required) Git URL to use markdown from
      -h, --help                         show CLI help
      -l, --list_route                   [default: true] Generate root route, listing all wiki links
      -p, --project_dir=project_dir      (required) angular project dir
      -r, --route=route                  [default: wiki] Route, e.g.: /wiki
      -v, --version                      show CLI version
      --ng_project_name=ng_project_name  angular project name, defaults to first in angular.json

Now, let's show how to use this in a project.

    $ ng new foo --routing --interactive=false
    $ cd foo
    $ mkdir src/app/wiki
    $ ng-git-gen -p "$PWD" -g 'https://github.com/Fantom-foundation/fantom-dev-web.wiki.git' -l

This will populate `src/app/wiki/generated`. Next, you can include this in your `src/app/app-routing.module.ts`:

```typescript
const routes: Routes = [{ path: 'wiki', loadChildren: './wiki/generated/generated.module#GeneratedModule' }];
```

# Extracting body from HTML

    hxnormalize -xe foo.html | hxselect -cs '\n' 'body'
