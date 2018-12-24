import { Routes } from '@angular/router';
import { ensure_quoted } from './utils';

export const component_gen = (prefix: string, name: string, template: string,
                              styles: string[] | undefined, className: string): string =>
    `import { Component } from '@angular/core';


@Component({
  selector: ${ensure_quoted(prefix + '-' + name)},
  template: ${ensure_quoted(template, '`')},
  styles: [${styles == null || !styles.length ? '' : styles.map(s => ensure_quoted(s)).join(', ')}]
})
export class ${className} {}
`;

export const component_gen_tpl_url = (componentHeader: string, prefix: string, name: string, templateUrl: string,
                                      styles: string[] | undefined, className: string): string =>
    `import { Component } from '@angular/core';

${componentHeader}
@Component({
  selector: ${ensure_quoted(prefix + '-' + name)},
  templateUrl: ${ensure_quoted(templateUrl)},
  styles: [${styles == null || !styles.length ? '' : styles.map(s => ensure_quoted(s)).join(', ')}]
})
export class ${className} {}
`;

export const component_gen_tpl_url_styles_url = (componentHeader: string, prefix: string, name: string,
                                                 templateUrl: string, styleUrls: string[] | undefined,
                                                 className: string): string =>
    `import { Component } from '@angular/core';

${componentHeader}
@Component({
  selector: ${ensure_quoted(prefix + '-' + name)},
  templateUrl: ${ensure_quoted(templateUrl)},
  styleUrls: [${styleUrls == null || !styleUrls.length ? '' : styleUrls.map(s => ensure_quoted(s)).join(', ')}]
})
export class ${className} {}
`;

const get_import_from_str = (extra_imports: string[]): string => extra_imports.length ?
    `,\n    ${extra_imports.map(l => l.slice(l.indexOf('{') + 1, l.lastIndexOf('}')).trim()).join(',')}` : '';

export const module_gen =
    (imports: string[], extra_imports: string[], declarations: string[], className: string): string =>
        `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

${extra_imports.join('\\n')}
${imports.join('\n')}
import { generatedRoutes } from './generated.routes';

@NgModule({
  declarations: [${declarations.join(', ')}],
  imports: [
    CommonModule, RouterModule, RouterModule.forChild(generatedRoutes)${get_import_from_str(extra_imports)}
  ]
})
export class ${className} {}
`;

export const routes_gen = (imports: string[], routes: Routes, constName: string): string =>
    `import { Routes } from '@angular/router';

${imports.join('\n')}

export const ${constName}: Routes = ${JSON.stringify(routes, null, 2).replace(/"/g, '')};
`;
