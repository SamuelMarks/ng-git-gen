ng-git-gen
==========

Generates Angular (Module, Components and Routes) from static files in a git repo.

Originally for Github Wiki integration.

[![NPM](https://nodei.co/npm/ng-git-gen.png)](https://nodei.co/npm/ng-git-gen/)

<span class="badge-npmversion"><a href="https://npmjs.org/package/badges" title="View this project on NPM"><img src="https://img.shields.io/npm/v/badges.svg" alt="NPM version" /></a></span>
[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)

## Install

    npm i -g ng-git-gen

## Options

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
    
    -p, --project_dir=project_dir                  (required) angular project dir
    
    -r, --route=route                              [default: wiki] Route, e.g.:
                                                 /wiki
    
    -v, --verbosity=verbosity                      verbosity
    
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
