const HAN_REGEX =
  /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FD5\uF900-\uFA6D\uFA70-\uFAD9]/;

const containsChinese = (text) => {
  // Empty strings don't contain Chinese.
  if (text === null || text === undefined || text === "") {
    return false;
  }

  // If you passed a number or object, it's kind of OK too.
  if (typeof text !== "string") text = text.toString();

  // Check for any match using regex; cast boolean
  return !!text.match(HAN_REGEX);
};

const currencyFormat = (currency) => {
  const k = 10000;
  const units = ["", "万", "亿", "万亿"];
  const i = Math.floor(Math.log(currency) / Math.log(k));
  return `${(currency / Math.pow(k, i)).toFixed(2)}${units[i]}`;
};

const getTheme = (light = false) => ({
  foreground: light ? "#536870" : "#fff",
  background: light ? "#fcf4dc" : "#000",
  cursor: "#536870",
  black: "#002831",
  brightBlack: "#001e27",
  red: "#d11c24",
  brightRed: "#bd3613",
  green: "#06989a",
  brightGreen: "#475b62",
  yellow: "#fce94f",
  brightYellow: "#536870",
  blue: "#3465a4",
  brightBlue: "#708284",
  magenta: "#c61c6f",
  brightMagenta: "#5956ba",
  cyan: "#259286",
  brightCyan: "#819090",
  white: "#eae3cb",
  brightWhite: "#fcf4dc",
});

export { containsChinese, currencyFormat, getTheme };
