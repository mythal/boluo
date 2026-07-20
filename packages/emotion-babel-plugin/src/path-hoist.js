// Adapted from Babel 7.29.0's packages/babel-traverse/src/path/lib/hoister.ts.
// Babel 8 removed this internal NodePath API, while Emotion 11.13.5 still uses it.

const referenceVisitor = {
  ReferencedIdentifier(path, state) {
    if (
      path.isJSXIdentifier() &&
      state.types.react.isCompatTag(path.node.name) &&
      !path.parentPath.isJSXMemberExpression()
    ) {
      return;
    }

    if (path.node.name === 'this') {
      let scope = path.scope;
      do {
        if (scope.path.isFunction() && !scope.path.isArrowFunctionExpression()) {
          break;
        }
      } while ((scope = scope.parent));
      if (scope) {
        state.breakOnScopePaths.push(scope.path);
      }
    }

    const binding = path.scope.getBinding(path.node.name);
    if (!binding) {
      return;
    }
    for (const violation of binding.constantViolations) {
      if (violation.scope !== binding.path.scope) {
        state.mutableBinding = true;
        path.stop();
        return;
      }
    }
    if (binding !== state.scope.getBinding(path.node.name)) {
      return;
    }
    state.bindings[path.node.name] = binding;
  },
};

class PathHoister {
  constructor(path, scope, types) {
    this.attachAfter = false;
    this.bindings = {};
    this.breakOnScopePaths = [];
    this.mutableBinding = false;
    this.path = path;
    this.scope = scope;
    this.scopes = [];
    this.types = types;
  }

  isCompatibleScope(scope) {
    for (const key of Object.keys(this.bindings)) {
      const binding = this.bindings[key];
      if (!scope.bindingIdentifierEquals(key, binding.identifier)) {
        return false;
      }
    }
    return true;
  }

  getCompatibleScopes() {
    let scope = this.path.scope;
    do {
      if (!this.isCompatibleScope(scope)) {
        break;
      }
      this.scopes.push(scope);
      if (this.breakOnScopePaths.includes(scope.path)) {
        break;
      }
    } while ((scope = scope.parent));
  }

  getAttachmentPath() {
    let path = this.getInitialAttachmentPath();
    if (!path) {
      return;
    }

    let targetScope = path.scope;
    if (targetScope.path === path) {
      targetScope = path.scope.parent;
    }
    if (targetScope.path.isProgram() || targetScope.path.isFunction()) {
      for (const name of Object.keys(this.bindings)) {
        if (!targetScope.hasOwnBinding(name)) {
          continue;
        }
        const binding = this.bindings[name];
        if (binding.kind === 'param' || binding.path.parentKey === 'params') {
          continue;
        }
        const bindingParentPath = this.getAttachmentParentForPath(binding.path);
        if (bindingParentPath.key >= path.key) {
          this.attachAfter = true;
          path = binding.path;
          for (const violationPath of binding.constantViolations) {
            if (this.getAttachmentParentForPath(violationPath).key > path.key) {
              path = violationPath;
            }
          }
        }
      }
    }
    return path;
  }

  getInitialAttachmentPath() {
    const scope = this.scopes.pop();
    if (!scope) {
      return;
    }
    if (scope.path.isFunction()) {
      if (this.hasOwnParamBindings(scope)) {
        if (this.scope === scope) {
          return;
        }
        const bodies = scope.path.get('body').get('body');
        return bodies.find((body) => !body.node._blockHoist);
      }
      return this.getNextScopeAttachmentParent();
    }
    if (scope.path.isProgram()) {
      return this.getNextScopeAttachmentParent();
    }
  }

  getNextScopeAttachmentParent() {
    const scope = this.scopes.pop();
    if (scope) {
      return this.getAttachmentParentForPath(scope.path);
    }
  }

  getAttachmentParentForPath(path) {
    do {
      if (!path.parentPath || (Array.isArray(path.container) && path.isStatement())) {
        return path;
      }
    } while ((path = path.parentPath));
    return path;
  }

  hasOwnParamBindings(scope) {
    for (const name of Object.keys(this.bindings)) {
      if (!scope.hasOwnBinding(name)) {
        continue;
      }
      const binding = this.bindings[name];
      if (binding.kind === 'param' && binding.constant) {
        return true;
      }
    }
    return false;
  }

  run() {
    this.path.traverse(referenceVisitor, this);
    if (this.mutableBinding) {
      return;
    }
    this.getCompatibleScopes();
    const attachTo = this.getAttachmentPath();
    if (!attachTo || attachTo.getFunctionParent() === this.path.getFunctionParent()) {
      return;
    }

    const { cloneNode, jsxExpressionContainer, variableDeclaration, variableDeclarator } =
      this.types;
    let uid = attachTo.scope.generateUidIdentifier('ref');
    const declarator = variableDeclarator(uid, this.path.node);
    const insert = this.attachAfter ? 'insertAfter' : 'insertBefore';
    const [attached] = attachTo[insert]([
      attachTo.isVariableDeclarator() ? declarator : variableDeclaration('var', [declarator]),
    ]);
    const parent = this.path.parentPath;
    if (parent.isJSXElement() && this.path.container === parent.node.children) {
      uid = jsxExpressionContainer(uid);
    }
    this.path.replaceWith(cloneNode(uid));
    return attached.isVariableDeclarator()
      ? attached.get('init')
      : attached.get('declarations.0.init');
  }
}

export function installPathHoist(path, types) {
  const prototype = Object.getPrototypeOf(path);
  if (prototype.hoist) {
    return;
  }
  Object.defineProperty(prototype, 'hoist', {
    configurable: true,
    value(scope = this.scope) {
      return new PathHoister(this, scope, types).run();
    },
    writable: true,
  });
}
