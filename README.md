ng-git-gen
==========

Generates Angular (Module, Components and Routes) from static files in a git repo

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/ng-git-gen.svg)](https://npmjs.org/package/ng-git-gen)
[![Downloads/week](https://img.shields.io/npm/dw/ng-git-gen.svg)](https://npmjs.org/package/ng-git-gen)
[![License](https://img.shields.io/npm/l/ng-git-gen.svg)](https://github.com/SamuelMarks/ng-git-gen/blob/master/package.json)

<!-- toc -->

* [Usage](#usage)
* [Commands](#commands)

<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g ng-git-gen
$ ng-git-gen COMMAND
running command...
$ ng-git-gen (-v|--version|version)
ng-git-gen/0.0.18 darwin-x64 node-v14.15.4
$ ng-git-gen --help [COMMAND]
USAGE
  $ ng-git-gen COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

<!-- commandsstop -->

## Install

    npm i -g ng-git-gen

## Options

    -R, --global_route                             [default: false] Lazy route in
                                                 app-routing
    
    -a, --afterstrap=afterstrap                    Execute this on the content
                                                 strings
    
    -b, --bootstrap=bootstrap                      Execute this before collecting
                                                 files with extension
    
    -d, --git_dir=git_dir                          [default: tmp] Directory to
                                                 clone git repo into
    
    -e, --ext=ext                                  [default: .md] Extension, e.g.:
                                                 '.md'
    
    -f, --postprocess_content=postprocess_content  Function to run on content
                                                 before conclusion, e.g.:
                                                 replace("fo",
                                                 "ba").replace("ca","ha"})
    
    -g, --git_url=git_url                          (required) Git URL to use
                                                 markdown from
    
    -h, --help                                     show CLI help
    
    -i, --extra_imports=extra_imports              Example: 'import {Foo} from
                                                 bar;' will add this line, and
                                                 `Foo` to `imports: []` in
                                                 Module
    
    -l, --list_route                               [default: true] Generate root
                                                 route, listing all wiki links
    
    -m, --global_route_mount=global_route_mount    [default: Value of route flag]
                                                 If --global-route
    
    -o, --output_ext=output_ext                    [default: .html] Output
                                                 extension
    
    -p, --project_dir=project_dir                  (required) angular project dir
    
    -r, --route=route                              [default: wiki] Route, e.g.:
                                                 /wiki
    
    -s, --styleUrls=styleUrls                      styleUrls, if starts with http,
                                                 then will download to generated
                                                 dir & update styleUrl to this
    
    -v, --verbosity=verbosity                      verbosity
    
    --lifecycle=lifecycle                          Add lifecycle to
                                                 component,e.g.: `--lifecycle
                                                 AfterViewInit --lifecycle_init
                                                 'console.info("AfterViewInit");
                                                 throw Error("WOW")'
    
    --lifecycle_init=lifecycle_init                Add lifecycle init to
                                                 component. See `--lifecycle`
                                                 for example.
    
    --ng_project_name=ng_project_name              angular project name, defaults
                                                 to first in angular.json
    
    --version                                      show CLI version

## Examples

### Full workflow, with github wiki integration
```bash
$ ng new foo --routing --interactive=false
$ cd foo
$ mkdir src/app/wiki
$ ng-git-gen -p "$PWD" -g 'https://github.com/Fantom-foundation/fantom-dev-web.wiki.git' -l
```

This will populate `src/app/wiki/generated`. Next, you can include this in your `src/app/app-routing.module.ts`:

```typescript
import { Routes } from '@angular/router';

const routes: Routes = [{ path: 'wiki', loadChildren: './wiki/generated/generated.module#GeneratedModule' }];
```

### Github wiki generation
```bash
 ng-git-gen -p "$PWD" -g 'https://github.com/Fantom-foundation/fantom-dev-web.wiki.git' -l
```

### RFC generation
```bash
ng-git-gen -p "$PWD" -g 'https://github.com/Fantom-foundation/fantom-rfcs' -l -b 'make html_body' -e '.html' -i "import { NgxPageScrollModule } from 'ngx-page-scroll';" -f '.replace(/href="#/g, `pageScroll href="#`)' -r rfc
```
