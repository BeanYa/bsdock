import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const forbiddenTransitions = [
  'transition-all',
  'transition-colors',
  'transition-[padding]',
  'transition-[width]',
]

const files = [
  'routes/__root.tsx',
  'components/app-sidebar.tsx',
]

describe('shell transition constraints', () => {
  it.each(files)('does not use forbidden transition classes in %s', (file) => {
    const source = readFileSync(resolve(import.meta.dirname, file), 'utf8')

    for (const transitionClass of forbiddenTransitions) {
      expect(source).not.toContain(transitionClass)
    }
  })
})
