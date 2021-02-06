import {readdirSync, readFileSync} from 'fs'
import * as path from 'path'

import * as ts from 'typescript'
import {encoding, ensure_quoted} from './utils'

export const updateGlobalRoutes = (gen_grandparent: string,
  global_routes: boolean,
  global_route_mount: string) => new Promise((resolve, reject) => {
  if (!global_routes) return resolve()

  const valid_route_names = ['app-routing.module.ts', 'app.routes.ts']
  const route_fname = readdirSync(gen_grandparent)
    .find(fname => valid_route_names.indexOf(fname) > -1)
  if (route_fname == null)
    return reject(new ReferenceError(
      `No route module (${valid_route_names.join(' or ')}) found in ${gen_grandparent}`,
    ))
  const full_route_fname = path.join(gen_grandparent, route_fname)
  const route_content = readFileSync(full_route_fname, {encoding})
  // console.info(route_content);
  // Parse a file
  const _sourceFile = ts.createSourceFile(
    route_fname,
    route_content,
    ts.ScriptTarget.Latest,
    /*setParentNodes */true,
  )

  // delint it
  // delint(sourceFile);

  // parse the AST
  const sourceFile = ts.createSourceFile('file.ts', 'const a = { foo: "bar" };',
    ts.ScriptTarget.Latest, false)

// get the object literal expression
  const declaration = _sourceFile.statements.find(ts.isVariableStatement)!.declarationList.declarations
    .find(t => ((t.type as any).typeName as ts.Identifier).escapedText === 'Routes')!

  const arrayLiteralExpression = declaration.initializer as ts.ArrayLiteralExpression

  console.info('arrayLiteralExpression:', arrayLiteralExpression, ';')

  const transformedArray = ts.updateArrayLiteral(arrayLiteralExpression, [...arrayLiteralExpression.elements,
    ts.createObjectLiteral([
      ts.createPropertyAssignment(
        'path', ts.createStringLiteral(ensure_quoted('myPath',
        ))),
      ts.createPropertyAssignment(
        'loadChildren', ts.createStringLiteral(ensure_quoted('myLoadChildren',
        ))),
    ]),
  ])

  const newNodeText = ts.createPrinter()
    .printNode(ts.EmitHint.Unspecified, transformedArray, sourceFile)

// get the new source file text and reparse it to a new AST
  const oldText = sourceFile.text
  const newText = oldText.substring(0, transformedArray.getStart(sourceFile, true))
    + newNodeText + oldText.substring(transformedArray.end)
  const newSourceFile = ts.createSourceFile('file.ts', newText, ts.ScriptTarget.Latest, false)

// outputs: `const a = { foo: 'bar', can: 'haz' };`
  console.log(newText)
})

/*
export function delint(sourceFile: ts.SourceFile) {
  delintNode(sourceFile);

  function delintNode(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.VariableDeclaration && (node as any).type.typeName.escapedText === 'Routes') {
      console.info('node:', node.kind, node, ';');
      (node as any).type.typeName.escapedText = 'Routes2';
    }

    ts.forEachChild(node, delintNode);

    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed
    });
    const result = printer.printNode(
      ts.EmitHint.Unspecified,
      ,
      sourceFile
    );

    console.log(result);
  }

  function report(node: ts.Node, message: string) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );
    console.log(
      `${sourceFile.fileName} (${line + 1},${character + 1}): ${message}`
    );
  }
}
*/
