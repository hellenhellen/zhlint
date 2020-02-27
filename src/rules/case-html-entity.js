const {
  findTokenBefore,
  findTokenAfter
} = require('./util')

module.exports = (token, index, group, matched, marks) => {
  if (token.raw === ';') {
    const tokenBefore = findTokenBefore(group, token)
    if (
      tokenBefore &&
      tokenBefore.type === 'content-half' &&
      !tokenBefore.rawSpaceAfter
    ) {
      const tokenBeforeBefore = findTokenBefore(group, tokenBefore)
      if (
        tokenBeforeBefore.raw === '&' &&
        !tokenBeforeBefore.rawSpaceAfter
      ) {
        token.content = ';'
      }
    }
  }
}
