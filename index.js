import { Terminal } from "xterm";
import { curry } from "lodash";
import axios from "axios";
import { table, getBoardCharacters, getBorderCharacters } from "table";
import { Unicode11Addon } from "xterm-addon-unicode11";
import { FitAddon } from "xterm-addon-fit";
import { SearchAddon } from "xterm-addon-search";
import { WebglAddon } from "xterm-addon-webgl";
import io from "socket.io-client";
import { AttachAddon } from "xterm-addon-attach";
import "xterm/css/xterm.css";
import { containsChinese } from "./utils";

let terminal;
let current = 0;
let charWidth, charHeight;
let command = "";

const NEWLINE = "\r\n";
const BACKSPACE = "\b \b";
const commandHistory = [];
const LOCAL_URL = "localhost:8888";
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
const fitAddon = new FitAddon();
const getTableConfig = (border) => ({
  border: getBorderCharacters(border),
  columnDefault: { alignment: "center" },
});

const wrapMsg = (msg) => {
  terminal.writeln("");
  terminal.write(msg);
  terminal.writeln("");
  prompt(terminal);
};
const currencyFormat = (currency) => {
  const k = 10000;
  const units = ["", "万", "亿", "万亿"];
  const i = Math.floor(Math.log(currency) / Math.log(k));
  return `${(currency / Math.pow(k, i)).toFixed(2)}${units[i]}`;
};
// const onData = curry(_onData);
const terminalContainer = document.getElementById("terminal-container");

const setTerminalSize = () => {
  const width = window.innerWidth.toString() + "px";
  const height = window.innerHeight.toString() + "px";

  terminalContainer.style.width = width;
  terminalContainer.style.height = height;

  fitAddon.fit();
};
const socket = io("ws://localhost:8888");

socket.on("connect", () => {
  socket.send("Hello");
});
socket.on("ai", (data) => {
  wrapMsg(data);
});
socket.on("define", (data) => {
  wrapMsg(data);
});
socket.on("weather", (data) => {
  onWeatherData(JSON.parse(data).data);
});
socket.on("stock", (data) => {
  onStockData(JSON.parse(data));
});
socket.on("memo", () => {});

window.addEventListener("resize", setTerminalSize);

const createTerminal = () => {
  while (terminalContainer.children.length > 0) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }
  terminal = new Terminal({
    cursorBlink: "block",
    fontSize: 18,
    fontFamily: "Ubuntu Mono, monospace, Source Han Serif",
    theme: getTheme(),
    scrollback: 1000,
    tabStopWidth: 8,
    rendererType: "dom",
  });

  terminal.open(terminalContainer);

  const searchAddon = new SearchAddon();
  const attachAddon = new AttachAddon(socket);
  const webglAddon = new WebglAddon();
  const unicode11Addon = new Unicode11Addon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(searchAddon);
  terminal.loadAddon(attachAddon);
  // terminal.loadAddon(webglAddon);
  terminal.loadAddon(unicode11Addon);
  fitAddon.fit();
  terminal.focus();
  runFakeTerminal();
};

const runFakeTerminal = () => {
  if (terminal._initialized) {
    return;
  }

  terminal._initialized = true;

  setTerminalSize();
  terminal.prompt = () => {
    terminal.write(`${NEWLINE}\x1b[32melectric@moon:~$ \x1b[0m`);
  };
  terminal.writeln("Welcome to the electonic moon!");
  terminal.writeln("");
  terminal.prompt();

  // This happens when the user types or pastes into the terminal
  terminal.onData((e) => {
    switch (e) {
      case "\u0003": // Ctrl + C
        terminal.write("^C");
        terminal.prompt();
        break;
      case "\r": // Enter
        runCommand(command);
        commandHistory.push(command);
        current = commandHistory.length;
        command = "";
        break;
      case "\u007F": // Backspace DEL
        // Do not delete the prompt
        if (terminal._core.buffer.x > 17) {
          terminal.write(BACKSPACE);
          if (command.length > 0) {
            command = command.slice(0, command.length - 1);
          }
        }
        break;
      case "\u001b[A": // Arrow Up
        if (commandHistory.length > 0) {
          current = Math.max(0, current - 1);
          clearCommand(command.length);
          setCurrentCommand();
        }
        break;
      case "\u001b[B": // Arrow Down
        if (commandHistory.length > 0) {
          current = Math.min(commandHistory.length, current + 1);
          clearCommand(command.length);
          setCurrentCommand();
        }
        break;
      default:
        // if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x78)) {
        command += e;
        terminal.write(e);
    }
  });
};

createTerminal();

const commands = {
  ai: {
    f: (msg) => {
      socket.emit("ai", msg);
    },
  },
  define: {
    f: (words) => {
      socket.emit("define", words.join(" "));
    },
  },
  help: {
    f: () => {
      terminal.writeln(
        [
          "welcome to the \x1b[33melectonic moon\x1b[0m! Try some of the commands below.",
          "",
          ...Object.keys(commands).map(
            (e) => ` ${e.padEnd(10)} \x1b[34m${commands[e].desc}\x1b[0m`
          ),
        ].join(NEWLINE)
      );
      prompt(terminal);
    },
    desc: "prints the help message",
  },
  light: {
    f: () => {
      terminal.setOption("theme", getTheme(true));
      prompt(terminal);
    },
    desc: "switch to the light mode",
  },
  dark: {
    f: () => {
      terminal.setOption("theme", getTheme());
      prompt(terminal);
    },
    desc: "switch to the dark mode",
  },
  weather: {
    f: () => {
      socket.emit("weather");
    },
    desc: "fetch current weather conditions",
  },
  stock: {
    f: (symbol) => {
      socket.emit("stock", symbol);
    },
  },
  joke: {
    f: () => {
      axios.get(`http://${LOCAL_URL}/joke`).then(
        ({
          data: {
            data: { content },
          },
        }) => {
          terminal.writeln(NEWLINE + content.trim());
          prompt(terminal);
        }
      );
    },
  },
};

const prompt = (terminal) => {
  command = "";
  terminal.prompt();
};

const runCommand = (str) => {
  const cs = str.trim().split(" ");
  const command = cs.shift();
  if (command !== "define" && containsChinese(command)) {
    terminal.writeln("");
    commands["ai"].f(command);
    return;
  }
  if (command === command.toUpperCase()) {
    commands["stock"].f(command);
    return;
  }
  if (command.length > 0) {
    terminal.writeln("");
    if (command in commands) {
      commands[command].f(cs);
      return;
    }
    terminal.writeln(`${command}: command not found`);
  }
  terminal.prompt();
};

const _onData = (terminal, data) => {
  terminal.write(data);
};

// +-----+------+------+------+------+------+------+
// | AQI | 空气 | 温度 | 湿度 | 天气 | 风向 | 风力 |
// |-----|------|------|------|------|------|------|
// | 41  | 优   | 29   | 54   | 晴   | 8    | 2    |
// +-----+------+------+------+------+------+------+
const onWeatherData = ({
  air: { aqi, aqi_name: aqiName },
  observe: {
    degree,
    humidity,
    weather,
    wind_direction: windDirection,
    wind_power: windPower,
  },
}) => {
  const weatherTable = [
    ["AQI", "空气", "温度", "湿度", "天气", "风向", "风力"],
    [
      aqi,
      aqiName,
      `${degree}°C`,
      `${humidity}%`,
      weather,
      `${windDirection}°`,
      `${windPower} 级`,
    ],
  ];
  terminal.write(
    NEWLINE +
      table(weatherTable, getTableConfig("ramac")).replaceAll("\n", NEWLINE)
  );
  prompt(terminal);
};

const onStockData = ({ quoteResponse: { result, error } }) => {
  if (!error) {
    const {
      displayName,
      preMarketPrice,
      regularMarketChangePercent,
      regularMarketPrice,
      regularMarketDayRange,
      regularMarketVolume,
      fiftyTwoWeekRange,
      marketCap,
      currency,
    } = result[0];
    const stockTable = [
      [
        "公司",
        "盘前价格",
        "涨跌幅度",
        "市场价格",
        "市价范围",
        "成交量",
        "52周范围",
        "市值",
        "单位",
      ],
      [
        displayName.split(" ")[0],
        preMarketPrice || "暂无成交",
        `${regularMarketChangePercent.toFixed(2)}%`,
        regularMarketPrice,
        regularMarketDayRange.replace("-", "~"),
        `${currencyFormat(regularMarketVolume)}股`,
        fiftyTwoWeekRange.replace("-", "~"),
        currencyFormat(marketCap),
        currency,
      ],
    ];
    terminal.write(
      NEWLINE +
        table(stockTable, getTableConfig("norc")).replaceAll("\n", NEWLINE)
    );
    prompt(terminal);
  }
};

const clearCommand = (length) => {
  let i = 0;
  while (i < length) {
    terminal.write(BACKSPACE);
    i++;
  }
};

const setCurrentCommand = () => {
  const currentCommand =
    current === commandHistory.length ? "" : commandHistory[current];
  terminal.write(currentCommand);
  command = currentCommand;
};

const _onConnect = (socket, fitAddon) => {
  socket.emit("terminal");
  fitAddon.fit();
};

const _onDisconnect = () => {
  terminal.writeln("terminal disconnected...");
};

const getHost = () => {
  const l = location;
  return l.origin || l.protocol + "//" + l.host;
};

const connect = (prefix, socketPath) => {
  const href = getHost();
  const FIVE_SECONDS = 5000;

  const path = socketPath + "/" + prefix;
};
