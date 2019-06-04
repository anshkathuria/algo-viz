const TYPES = require('./utils/types')
const fs = require('fs')
module.exports = function (steps, {
    scopeStack = [],
    callStack = [],
    scopeChain = {},
    identifiers = {},
    funcScopes = {},
    calls = {}
}) {
    const states = []
    for (const step of steps) {
        if (step.scope) {
            const [parent, scope] = step.scope
            if (!(scope in identifiers)) {
                identifiers[scope] = {}
            }
            if (!(scope in scopeChain)) {
                scopeChain[scope] = { parent, children: [] }
                if (parent !== null) {
                    // if(!(parent in scopeChain)){
                    //     for(const s in scopeChain){
                    //         for(const child of s.children){

                    //         }
                    //     }
                    // }
                    try {
                        scopeChain[parent].children.push(scope)
                    } catch (e) {
                        console.log(scopeStack)
                        console.log(parent, scope)
                        console.log(scopeChain)
                        throw (e)
                    }
                }
            }
            const s = scopeStack
            if (s[s.length - 1] !== scope) {
                while (s.length && (![parent, scope].includes(s[s.length - 1]))) {
                    s.pop()
                }
                if (step.type !== TYPES.RETURN && s[s.length - 1] !== scope) s.push(scope)
            }
        }
        if ([TYPES.ASSIGNMENT, TYPES.DECLARATION].includes(step.type) && step.scope && step.name) {
            let { name, scope: [_, scope], block } = step
            if (step.type === TYPES.DECLARATION) {
                if (!block) {
                    while (scope && !(scope in funcScopes)) {
                        scope = scopeChain[scope].parent
                    }
                }
                if (!identifiers[scope][name]) {
                    identifiers[scope][name] = [undefined]
                }
                const ids = identifiers[scope][name]
                ids[ids.length - 1] = step.value
            } else if (step.type === TYPES.ASSIGNMENT) {
                let current = scope
                let vals = null
                while (!vals) {
                    vals = identifiers[current][name]
                    current = scopeChain[current].parent
                    if (current === null) break;
                }
                if (vals) {
                    vals[vals.length - 1] = step.value
                }
            }
        }
        if ([TYPES.FUNC, TYPES.RETURN].includes(step.type)) {
            const fScope = step.scope[1]
            if (step.type === TYPES.FUNC) {
                callStack.push(step.name)
                funcScopes[fScope] = step.name
                const queue = [fScope]
                while (queue.length) {
                    const scope = queue.shift()
                    const ids = identifiers[scope]
                    for (const id in ids) {
                        ids[id].push(undefined)
                    }
                    const { children } = scopeChain[scope]
                    for (const child of children) {
                        queue.push(child)
                    }
                }
            } else {
                callStack.pop()
                const queue = [fScope]
                while (queue.length) {
                    const scope = queue.shift()
                    const ids = identifiers[scope]
                    for (const id in ids) {
                        ids[id].pop()
                        if (!ids[id].length) {
                            ids[id].push(undefined)
                        }
                    }
                    const { children } = scopeChain[scope]
                    for (const child of children) {
                        queue.push(child)
                    }
                }
            }
        }
        states.push(JSON.stringify(identifiers))
        console.log(step.type, step.name, identifiers);
        // console.log(callStack)
    }
    fs.writeFileSync('states.json', states)
    return { scopeChain, scopeStack, callStack, identifiers, funcScopes }
}