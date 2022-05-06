import { describe, test, expect } from 'vitest'

import run, { Options } from '../src/run'
import { ValidationTarget } from '../src/report'
import {
  BRACKET_NOSPACE_INSIDE,
  CODE_SPACE_OUTSIDE,
  CONTENT_SPACE_HALF_WIDTH,
  MARKDOWN_NOSPACE_INSIDE,
  PUNCTUATION_FULL_WIDTH,
  PUNCTUATION_NOSPACE_BEFORE,
  PUNCTUATION_UNIFICATION_SIMPLIFIED,
  QUOTE_NOSPACE_INSIDE
} from '../src/rules/messages'

type Warning = {
  index: number
  target: ValidationTarget
  message: string
}

const getOutput = (...args: [string, Options?]) => run(...args).result

const lint = (
  ...args: [string, Options?]
): {
  output: string
  warnings: Warning[]
} => {
  const output = run(...args)
  return {
    output: output.result,
    warnings: output.validations.map((validation) => {
      const { index, length, target, message } = validation
      return { index: index + length, target, message }
    })
  }
}

describe('lint by rules', () => {
  test('[space-trim] trim the spaces', () => {
    const options: Options = { rules: { trimSpace: true } }
    expect(getOutput(' `foo` "foo" ')).toBe(' `foo` "foo" ')
    expect(getOutput(' `foo` "foo" ', options)).toBe('`foo` "foo"')
    expect(getOutput(' foo bar   ', options)).toBe('foo bar')
    expect(getOutput('中文, 中文. ', options)).toBe('中文, 中文.')
    expect(getOutput('中文, 中文.中； 文。 ', options)).toBe('中文, 中文.中； 文。')
    expect(getOutput(' " bar " ', options)).toBe('" bar "')
    expect(getOutput(' (bar) ', options)).toBe('(bar)')
  })
  test('[hyper-mark] the position of spaces around hyper marks (if any)', () => {
    const options: Options = {
      rules: { noSpaceInsideMark: true }
    }
    expect(lint('x ** yyy ** z', options)).toEqual({
      output: 'x **yyy** z',
      warnings: [
        {
          index: 4,
          target: ValidationTarget.SPACE_AFTER,
          message: MARKDOWN_NOSPACE_INSIDE
        },
        {
          index: 8,
          target: ValidationTarget.SPACE_AFTER,
          message: MARKDOWN_NOSPACE_INSIDE
        }
      ]
    })
    expect(getOutput('x _** yyy ** _ z', options)).toBe('x _**yyy**_ z')
    expect(getOutput('x _ ** yyy **_ z', options)).toBe('x _**yyy**_ z')

    expect(getOutput('_ ** yyy **_', options)).toBe('_**yyy**_')
  })
  describe('[hyper-code] the existence of spaces around hyper code marks', () => {
    test('forcing spaces', () => {
      const options: Options = { rules: { spaceOutsideCode: true } }
      expect(lint('xxx`foo`xxx', options)).toEqual({
        output: 'xxx `foo` xxx',
        warnings: [
          {
            index: 3,
            target: ValidationTarget.SPACE_AFTER,
            message: CODE_SPACE_OUTSIDE
          },
          {
            index: 8,
            target: ValidationTarget.SPACE_AFTER,
            message: CODE_SPACE_OUTSIDE
          }
        ]
      })
      expect(getOutput('xxx`foo` xxx', options)).toBe('xxx `foo` xxx')
      expect(getOutput('xxx `foo`xxx', options)).toBe('xxx `foo` xxx')
      expect(getOutput('xxx `foo` xxx', options)).toBe('xxx `foo` xxx')

      // internal spaces would be kept
      expect(getOutput('xxx ` foo`xxx', options)).toBe('xxx ` foo` xxx')

      expect(lint('xxx<code>foo</code>xxx', options)).toEqual({
        output: 'xxx <code>foo</code> xxx',
        warnings: [
          {
            index: 3,
            target: ValidationTarget.SPACE_AFTER,
            message: CODE_SPACE_OUTSIDE
          },
          {
            index: 19,
            target: ValidationTarget.SPACE_AFTER,
            message: CODE_SPACE_OUTSIDE
          }
        ]
      })
      expect(getOutput('xxx<code>foo</code> xxx', options)).toBe(
        'xxx <code>foo</code> xxx'
      )
      expect(getOutput('xxx <code>foo</code>xxx', options)).toBe(
        'xxx <code>foo</code> xxx'
      )
      expect(getOutput('xxx <code>foo</code> xxx', options)).toBe(
        'xxx <code>foo</code> xxx'
      )
    })
    test('forcing no spaces', () => {
      const options: Options = { rules: { spaceOutsideCode: false } }
      expect(getOutput('xxx`foo`xxx', options)).toBe('xxx`foo`xxx')
      expect(getOutput('xxx`foo` xxx', options)).toBe('xxx`foo`xxx')
      expect(getOutput('xxx `foo`xxx', options)).toBe('xxx`foo`xxx')
      expect(getOutput('xxx `foo` xxx', options)).toBe('xxx`foo`xxx')

      expect(getOutput('xxx<code>foo</code>xxx', options)).toBe(
        'xxx<code>foo</code>xxx'
      )
      expect(getOutput('xxx<code>foo</code> xxx', options)).toBe(
        'xxx<code>foo</code>xxx'
      )
      expect(getOutput('xxx <code>foo</code>xxx', options)).toBe(
        'xxx<code>foo</code>xxx'
      )
      expect(getOutput('xxx <code>foo</code> xxx', options)).toBe(
        'xxx<code>foo</code>xxx'
      )
    })
    test('keep the original spaces', () => {
      const options = undefined
      expect(getOutput('xxx`foo`xxx', options)).toBe('xxx`foo`xxx')
      expect(getOutput('xxx`foo` xxx', options)).toBe('xxx`foo` xxx')
      expect(getOutput('xxx `foo`xxx', options)).toBe('xxx `foo`xxx')
      expect(getOutput('xxx `foo` xxx', options)).toBe('xxx `foo` xxx')

      expect(getOutput('xxx<code>foo</code>xxx', options)).toBe(
        'xxx<code>foo</code>xxx'
      )
      expect(getOutput('xxx<code>foo</code> xxx', options)).toBe(
        'xxx<code>foo</code> xxx'
      )
      expect(getOutput('xxx <code>foo</code>xxx', options)).toBe(
        'xxx <code>foo</code>xxx'
      )
      expect(getOutput('xxx <code>foo</code> xxx', options)).toBe(
        'xxx <code>foo</code> xxx'
      )
    })
  })
  test('[punctuation-width] format each punctuation into the right width options', () => {
    const options = {
      rules: {
        halfWidthPunctuation: `()`,
        fullWidthPunctuation: `，。：；？！“”‘’`
      }
    }
    expect(lint('你好,再见.', options)).toEqual({
      output: '你好，再见。',
      warnings: [
        {
          index: 3,
          target: ValidationTarget.CONTENT,
          message: PUNCTUATION_FULL_WIDTH
        },
        {
          index: 6,
          target: ValidationTarget.CONTENT,
          message: PUNCTUATION_FULL_WIDTH
        }
      ]
    })
    expect(getOutput('你（好）,再见.', options)).toBe('你(好)，再见。')
    expect(getOutput("你'好',再见.", options)).toBe('你‘好’，再见。')
    expect(getOutput('你"好",再见.', options)).toBe('你“好”，再见。')
    expect(getOutput('"你\'好\'",再见.', options)).toBe('“你‘好’”，再见。')

    // keep the single quote between half-width content without spaces
    expect(getOutput("what's up", options)).toBe("what's up")
  })
  describe('[punctuation-unification] unify the punctuation choices', () => {
    test('simplified', () => {
      const options: Options = {
        rules: { unifiedPunctuation: 'simplified' }
      }
      expect(
        lint(
          // Any better example?
          '老師說：「你們要記住國父說的『青年要立志做大事，不要做大官』這句話。」',
          options
        )
      ).toEqual({
        output:
          '老師說：“你們要記住國父說的‘青年要立志做大事，不要做大官’這句話。”',
        warnings: [
          {
            index: 4,
            target: ValidationTarget.START_CONTENT,
            message: PUNCTUATION_UNIFICATION_SIMPLIFIED
          },
          {
            index: 34,
            target: ValidationTarget.END_CONTENT,
            message: PUNCTUATION_UNIFICATION_SIMPLIFIED
          },
          {
            index: 14,
            target: ValidationTarget.START_CONTENT,
            message: PUNCTUATION_UNIFICATION_SIMPLIFIED
          },
          {
            index: 29,
            target: ValidationTarget.END_CONTENT,
            message: PUNCTUATION_UNIFICATION_SIMPLIFIED
          }
        ]
      })
    })
    test('traditional', () => {
      const options: Options = {
        rules: { unifiedPunctuation: 'traditional' }
      }
      expect(
        getOutput(
          '老師說：“你們要記住國父說的‘青年要立志做大事，不要做大官’這句話。”',
          options
        )
      ).toBe(
        '老師說：「你們要記住國父說的『青年要立志做大事，不要做大官』這句話。」'
      )
    })
  })
  describe('[space-content] the space between content', () => {
    test('one and only one space between half-width content', () => {
      const options: Options = {
        rules: { spaceBetweenHalfWidthContent: true }
      }
      expect(lint('foo bar   baz', options)).toEqual({
        output: 'foo bar baz',
        warnings: [
          {
            index: 7,
            target: ValidationTarget.SPACE_AFTER,
            message: CONTENT_SPACE_HALF_WIDTH
          }
        ]
      })
    })
    test('no space between full-width content', () => {
      const options: Options = {
        rules: { noSpaceBetweenFullWidthContent: true }
      }
      expect(getOutput('中文 中文 中 文', options)).toBe('中文中文中文')
    })
    test('one space between mixed-width content', () => {
      const options: Options = {
        rules: { spaceBetweenMixedWidthContent: true }
      }
      expect(getOutput('中文foo 中文 foo中foo文', options)).toBe(
        '中文 foo 中文 foo 中 foo 文'
      )
    })
    test('no space between mixed-width content', () => {
      const options: Options = {
        rules: { spaceBetweenMixedWidthContent: false }
      }
      expect(getOutput('中文foo 中文 foo中foo文', options)).toBe(
        '中文foo中文foo中foo文'
      )
    })
  })
  describe('[space-punctuation] the space between content and punctuation', () => {
    test('no space before punctuation', () => {
      const options: Options = {
        rules: { noSpaceBeforePunctuation: true }
      }
      expect(lint('中文 , 一. 二 ；三。四', options)).toEqual({
        output: '中文, 一. 二；三。四',
        warnings: [
          {
            index: 2,
            target: ValidationTarget.SPACE_AFTER,
            message: PUNCTUATION_NOSPACE_BEFORE
          },
          {
            index: 9,
            target: ValidationTarget.SPACE_AFTER,
            message: PUNCTUATION_NOSPACE_BEFORE
          }
        ]
      })
      expect(getOutput('foo, " bar " , baz', options)).toBe(
        'foo, " bar ", baz'
      )
      expect(getOutput('foo. “ bar ” . baz', options)).toBe('foo. “ bar ”. baz')
      expect(getOutput('一， " 二 " ， 三', options)).toBe('一， " 二 "， 三')
      expect(getOutput('一。 “ 二 ” 。 三', options)).toBe('一。 “ 二 ”。 三')
      expect(getOutput('foo, " bar " , baz', options)).toBe('foo, " bar ", baz')
      expect(getOutput('foo. “ bar ” . baz', options)).toBe('foo. “ bar ”. baz')
      expect(getOutput('一， " 二 " ， 三', options)).toBe('一， " 二 "， 三')
      expect(getOutput('一。 “ 二 ” 。 三', options)).toBe('一。 “ 二 ”。 三')
    })
    test('one space after half-width punctuation', () => {
      const options: Options = {
        rules: { spaceAfterHalfWidthPunctuation: true }
      }
      expect(getOutput('中文, 中文.中； 文。中文', options)).toBe(
        '中文, 中文. 中； 文。中文'
      )
      expect(getOutput('foo," bar " , baz', options)).toBe('foo, " bar " , baz')
      expect(getOutput('foo.“ bar ” . baz', options)).toBe('foo. “ bar ” . baz')
    })
    test('no space after full-width punctuation', () => {
      const options: Options = {
        rules: { noSpaceAfterFullWidthPunctuation: true }
      }
      expect(getOutput('中文, 中文.中； 文。中文', options)).toBe(
        '中文, 中文.中；文。中文'
      )
      expect(getOutput('一， " 二 " ， 三', options)).toBe('一，" 二 " ，三')
      expect(getOutput('一。 “ 二 ” 。 三', options)).toBe('一。“ 二 ” 。三')
    })
  })
  describe('[space-quote] the space around quotes', () => {
    test('no space inside', () => {
      const options: Options = {
        rules: {
          noSpaceInsideQuote: true
        }
      }
      expect(lint('foo " bar " baz', options)).toEqual({
        output: 'foo "bar" baz',
        warnings: [
          {
            index: 5,
            target: ValidationTarget.INNER_SPACE_BEFORE,
            message: QUOTE_NOSPACE_INSIDE
          },
          {
            index: 9,
            target: ValidationTarget.SPACE_AFTER,
            message: QUOTE_NOSPACE_INSIDE
          }
        ]
      })
      expect(getOutput('foo “ bar ” baz', options)).toBe('foo “bar” baz')
    })
    test('one space outside half quote', () => {
      const options: Options = {
        rules: {
          spaceOutsideHalfQuote: true
        }
      }
      expect(getOutput('foo " bar " baz', options)).toBe('foo " bar " baz')
      expect(getOutput('foo “ bar ” baz', options)).toBe('foo “ bar ” baz')

      // TODO: no space besides content?
      expect(getOutput('一 " 二 " 三', options)).toBe('一 " 二 " 三')
    })
    test('no space outside half quote', () => {
      const options: Options = {
        rules: {
          spaceOutsideHalfQuote: false
        }
      }
      expect(getOutput('foo " bar " baz', options)).toBe('foo" bar "baz')
      expect(getOutput('一 " 二 " 三', options)).toBe('一" 二 "三')
      expect(getOutput('一 “ 二 ” 三', options)).toBe('一 “ 二 ” 三')
    })
    test('no space outside full quote', () => {
      const options: Options = {
        rules: {
          noSpaceOutsideFullQuote: true
        }
      }
      expect(getOutput('一 “ 二 ” 三', options)).toBe('一“ 二 ”三')
      expect(getOutput('foo “ bar ” baz', options)).toBe('foo“ bar ”baz')
      expect(getOutput('一 “ 二 ” 三', options)).toBe('一“ 二 ”三')
    })
  })
  describe('[space-bracket] the space around brackets', () => {
    test('no space inside', () => {
      const options: Options = {
        rules: { noSpaceInsideBracket: true }
      }
      expect(lint('foo (bar) baz', options)).toEqual({
        output: 'foo (bar) baz',
        warnings: []
      })
      expect(lint('foo ( bar ) baz', options)).toEqual({
        output: 'foo (bar) baz',
        warnings: [
          {
            index: 5,
            target: ValidationTarget.SPACE_AFTER,
            message: BRACKET_NOSPACE_INSIDE
          },
          {
            index: 9,
            target: ValidationTarget.SPACE_AFTER,
            message: BRACKET_NOSPACE_INSIDE
          }
        ]
      })
      expect(getOutput('foo （bar） baz', options)).toBe('foo （bar） baz')
      expect(getOutput('foo （ bar ） baz', options)).toBe('foo （bar） baz')
    })
    test('one space outside', () => {
      const options: Options = {
        rules: { spaceOutsideHalfBracket: true }
      }
      expect(getOutput('foo(bar)baz', options)).toBe('foo (bar) baz')
      expect(getOutput('foo ( bar ) baz', options)).toBe('foo ( bar ) baz')
    })
    test('one space outside', () => {
      const options: Options = {
        rules: { noSpaceOutsideFullBracket: true }
      }
      // expect(getOutput('foo（bar）baz', options)).toBe('foo（bar）baz')
      expect(getOutput('foo （ bar ） baz', options)).toBe('foo（ bar ）baz')
    })
    test('no space outside', () => {
      const options: Options = {
        rules: { spaceOutsideHalfBracket: false }
      }
      expect(getOutput('foo(bar)baz', options)).toBe('foo(bar)baz')
      expect(getOutput('foo ( bar ) baz', options)).toBe('foo( bar )baz')
    })
  })
})

describe('lint by cases', () => {
  const defaultConfig: Options = {
    rules: {
      halfWidthPunctuation: `()`,
      fullWidthPunctuation: `，。：；？！“”‘’`,
      unifiedPunctuation: 'simplified',
      spaceBetweenHalfWidthContent: true,
      noSpaceBetweenFullWidthContent: true,
      spaceBetweenMixedWidthContent: true,
      noSpaceBeforePunctuation: true,
      spaceAfterHalfWidthPunctuation: true,
      noSpaceAfterFullWidthPunctuation: true,
      spaceOutsideHalfQuote: true,
      noSpaceOutsideFullQuote: true,
      noSpaceInsideQuote: true,
      spaceOutsideHalfBracket: true,
      noSpaceOutsideFullBracket: true,
      noSpaceInsideBracket: true,
      spaceOutsideCode: true,
      noSpaceInsideMark: true,
      trimSpace: true
    }
  }
  test('[case-linebreak] keep the linebreaks', () => {
    expect(
      getOutput(
        `
  > foo  
  > bar 
  > baz
    `.trim(),
        defaultConfig
      )
    ).toBe(
      `
  > foo  
  > bar 
  > baz
    `.trim()
    )
  })
  test.todo('abbr', () => {
    expect(getOutput('运行时 + 编译器 vs. 只包含运行时', defaultConfig)).toBe(
      '运行时 + 编译器 vs. 只包含运行时'
    )
  })
  test('URL', () => {
    expect(getOutput('Vue.js 是什么', defaultConfig)).toBe('Vue.js 是什么')
    expect(getOutput('www.vuejs.org', defaultConfig)).toBe('www.vuejs.org')
    expect(getOutput('https://vuejs.org', defaultConfig)).toBe('https://vuejs.org')
  })
  test('slash character', () => {
    expect(getOutput('想知道 Vue 与其它库/框架有哪些区别', defaultConfig)).toBe(
      '想知道 Vue 与其它库/框架有哪些区别'
    )
  })
  test('special characters', () => {
    expect(getOutput('Vue (读音 /vjuː/，类似于)', defaultConfig)).toBe(
      'Vue (读音 /vjuː/，类似于)'
    )
  })
  test.todo('plural brackets', () => {
    expect(getOutput('3 minite(s) left', defaultConfig)).toBe('3 minite(s) left')
  })
  test('single quote for shorthand', () => {
    expect(getOutput(`how many user's here`, defaultConfig)).toBe(
      `how many user's here`
    )
    expect(getOutput(`how many users' items here`, defaultConfig)).toBe(
      `how many users' items here`
    )
    expect(getOutput(`what's going on`, defaultConfig)).toBe(`what's going on`)
  })
  test('math exp', () => {
    expect(getOutput('1+1=2', defaultConfig)).toBe('1+1=2')
    expect(getOutput('a|b', defaultConfig)).toBe('a|b')
    expect(getOutput('a | b', defaultConfig)).toBe('a | b')
    expect(getOutput('a||b', defaultConfig)).toBe('a||b')
    expect(getOutput('a || b', defaultConfig)).toBe('a || b')
  })
  test('arrow chars', () => {
    expect(getOutput('Chrome 顶部导航 > 窗口 > 任务管理', defaultConfig)).toBe(
      'Chrome 顶部导航 > 窗口 > 任务管理'
    )
  })
  test('curly brackets', () => {
    expect(getOutput('# 简介 {#introduction}', defaultConfig)).toBe(
      '# 简介 {#introduction}'
    )
    expect(getOutput('# 简介{#introduction}', defaultConfig)).toBe(
      '# 简介 {#introduction}'
    )
    expect(getOutput('### 托管模式 {#takeover-mode}', defaultConfig)).toBe(
      '### 托管模式 {#takeover-mode}'
    )
  })
})
