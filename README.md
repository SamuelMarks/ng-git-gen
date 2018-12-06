ng-github-wiki-gen
==================

Generates Module, Components and Routes for Github Wiki integration with Angular.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)

# Install

    npm i -g https://api.github.com/repos/SamuelMarks/ng-github-wiki-gen/tarball

# Usage

    $ ng-github-wiki-gen --help
    
    OPTIONS
      -g, --git_url=git_url              (required) Git URL to use markdown from
      -h, --help                         show CLI help
      -l, --list_route                   Generate root route, listing all wiki links
      -p, --project_dir=project_dir      (required) angular project dir
      -v, --version                      show CLI version
      --ng_project_name=ng_project_name  angular project name, defaults to first in angular.json
