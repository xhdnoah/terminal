const HAN_REGEX = /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FD5\uF900-\uFA6D\uFA70-\uFAD9]/;

function containsChinese(text) {
  // Empty strings don't contain Chinese.
  if (text === null || text === undefined || text === '') { return false; }

  // If you passed a number or object, it's kind of OK too.
  if (typeof text !== 'string') text = text.toString();

  // Check for any match using regex; cast boolean
  return !!text.match(HAN_REGEX);
}

export {
  containsChinese
}
