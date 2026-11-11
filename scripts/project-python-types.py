"""Produce read-only signature views; never import or execute the SDK sources."""
import ast
import json
import hashlib
from pathlib import Path
import sys

source_root=Path(sys.argv[1])
output_root=Path(sys.argv[2])
class TypesOnly(ast.NodeTransformer):
    def visit_Expr(self,node):
        return None
    def visit_FunctionDef(self,node):
        node.body=[ast.Expr(value=ast.Constant(value=Ellipsis))]
        return node
    def visit_AsyncFunctionDef(self,node):
        return self.visit_FunctionDef(node)
    def visit_Call(self,node):
        node.keywords=[k for k in node.keywords if k.arg not in {'description','title','examples','example'}]
        return self.generic_visit(node)
    def visit_ClassDef(self,node):
        node=self.generic_visit(node)
        if not node.body: node.body=[ast.Expr(value=ast.Constant(value=Ellipsis))]
        return node

records=[]
for path in sorted(source_root.rglob('*.py')):
    relative=path.relative_to(source_root)
    raw=path.read_bytes()
    tree=TypesOnly().visit(ast.parse(raw.decode()))
    ast.fix_missing_locations(tree)
    projected=ast.unparse(tree)+'\n'
    output=output_root/relative.with_suffix('.pyi')
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(projected)
    records.append({'source':str(relative),'sourceSha256':hashlib.sha256(raw).hexdigest(),'file':str(relative.with_suffix('.pyi')),'sha256':hashlib.sha256(projected.encode()).hexdigest()})
print(json.dumps(records))
