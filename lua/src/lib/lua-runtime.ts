import { createRequire } from "node:module";
import type { LuaValue, RunResponse } from "./types";

const require = createRequire(import.meta.url);
const fengari = require("fengari") as typeof import("fengari");

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

export const LUA_VERSION = "5.3" as const;
export const LUA_RUNTIME = "fengari" as const;

export function maxInstructions(): number {
  const raw = Number(process.env.LUA_MAX_INSTRUCTIONS ?? 2_000_000);
  return Number.isFinite(raw) && raw > 1000 ? Math.floor(raw) : 2_000_000;
}

export function maxSourceBytes(): number {
  const raw = Number(process.env.LUA_MAX_SOURCE_BYTES ?? 65_536);
  return Number.isFinite(raw) && raw > 32 ? Math.floor(raw) : 65_536;
}

type LuaState = import("fengari").LuaState;

function openSafeLibs(L: LuaState) {
  const libs: Array<[string, (state: LuaState) => number]> = [
    ["_G", lualib.luaopen_base],
    ["coroutine", lualib.luaopen_coroutine],
    ["table", lualib.luaopen_table],
    ["string", lualib.luaopen_string],
    ["math", lualib.luaopen_math],
    ["utf8", lualib.luaopen_utf8],
  ];

  for (const [name, opener] of libs) {
    lauxlib.luaL_requiref(L, to_luastring(name), opener, 1);
    lua.lua_pop(L, 1);
  }
}

function parseErrorLine(message: string): number | null {
  const match = message.match(/(?:stdin|\[string "[^"]+"\]):(\d+):/);
  if (!match) return null;
  const line = Number(match[1]);
  return Number.isFinite(line) ? line : null;
}

function humanizeError(message: string): string {
  return message
    .replace(/^\[string "[^"]+"\]:/, "linha ")
    .replace(/^stdin:/, "linha ");
}

function luaValueToJs(L: LuaState, idx: number, depth = 0): LuaValue {
  const t = lua.lua_type(L, idx);
  switch (t) {
    case lua.LUA_TNIL:
      return null;
    case lua.LUA_TBOOLEAN:
      return Boolean(lua.lua_toboolean(L, idx));
    case lua.LUA_TNUMBER:
      return lua.lua_tonumber(L, idx);
    case lua.LUA_TSTRING:
      return lua.lua_tojsstring(L, idx) ?? "";
    case lua.LUA_TTABLE: {
      if (depth >= 3) return "<tabela>";
      const obj: Record<string, LuaValue> = {};
      const list: LuaValue[] = [];
      let sequential = true;
      let expected = 1;

      lua.lua_pushnil(L);
      while (lua.lua_next(L, idx < 0 ? idx - 1 : idx) !== 0) {
        const keyType = lua.lua_type(L, -2);
        const value = luaValueToJs(L, -1, depth + 1);
        if (keyType === lua.LUA_TNUMBER) {
          const key = lua.lua_tonumber(L, -2);
          if (sequential && key === expected) {
            list.push(value);
            expected += 1;
          } else {
            sequential = false;
            obj[String(key)] = value;
          }
        } else {
          sequential = false;
          const key =
            keyType === lua.LUA_TSTRING
              ? (lua.lua_tojsstring(L, -2) ?? "?")
              : `[${to_jsstring(lua.lua_typename(L, keyType))}]`;
          obj[key] = value;
        }
        lua.lua_pop(L, 1);
      }

      if (sequential && list.length > 0 && Object.keys(obj).length === 0) {
        return list;
      }
      for (let i = 0; i < list.length; i += 1) {
        obj[String(i + 1)] = list[i];
      }
      return obj;
    }
    case lua.LUA_TFUNCTION:
      return "<função>";
    case lua.LUA_TTHREAD:
      return "<thread>";
    case lua.LUA_TUSERDATA:
    case lua.LUA_TLIGHTUSERDATA:
      return "<userdata>";
    default:
      return `<${to_jsstring(lua.lua_typename(L, t))}>`;
  }
}

export function runLua(source: string): RunResponse {
  const started = performance.now();
  const limit = maxInstructions();
  const budget = maxSourceBytes();

  if (typeof source !== "string" || source.trim().length === 0) {
    return {
      status: "invalid",
      stdout: [],
      returns: [],
      error: "O caderno está vazio. Escreva um script Lua para executar.",
      line: null,
      elapsedMs: 0,
      instructionCount: 0,
      runtime: LUA_RUNTIME,
      luaVersion: LUA_VERSION,
    };
  }

  const bytes = Buffer.byteLength(source, "utf8");
  if (bytes > budget) {
    return {
      status: "invalid",
      stdout: [],
      returns: [],
      error: `Código grande demais (${bytes} bytes). Limite: ${budget}.`,
      line: null,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      instructionCount: 0,
      runtime: LUA_RUNTIME,
      luaVersion: LUA_VERSION,
    };
  }

  const L = lauxlib.luaL_newstate();
  const stdout: string[] = [];
  let instructions = 0;
  let timedOut = false;

  try {
    openSafeLibs(L);

    lua.lua_pushcfunction(L, (state) => {
      const n = lua.lua_gettop(state);
      const parts: string[] = [];
      for (let i = 1; i <= n; i += 1) {
        const text = to_jsstring(lauxlib.luaL_tolstring(state, i));
        parts.push(text);
        lua.lua_pop(state, 1);
      }
      stdout.push(parts.join("\t"));
      return 0;
    });
    lua.lua_setglobal(L, to_luastring("print"));

    const hookStep = 10_000;
    lua.lua_sethook(
      L,
      () => {
        instructions += hookStep;
        if (instructions >= limit) {
          timedOut = true;
          lauxlib.luaL_error(
            L,
            to_luastring("tempo esgotado: loop longo demais para o ateliê"),
          );
        }
      },
      lua.LUA_MASKCOUNT,
      hookStep,
    );

    const loadStatus = lauxlib.luaL_loadstring(L, to_luastring(source));
    if (loadStatus !== lua.LUA_OK) {
      const raw = lua.lua_tojsstring(L, -1) ?? "erro de sintaxe";
      return {
        status: "error",
        stdout,
        returns: [],
        error: humanizeError(raw),
        line: parseErrorLine(raw),
        elapsedMs: Number((performance.now() - started).toFixed(2)),
        instructionCount: instructions,
        runtime: LUA_RUNTIME,
        luaVersion: LUA_VERSION,
      };
    }

    const callStatus = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);

    if (callStatus !== lua.LUA_OK) {
      const raw = lua.lua_tojsstring(L, -1) ?? "erro em tempo de execução";
      return {
        status: timedOut ? "timeout" : "error",
        stdout,
        returns: [],
        error: humanizeError(raw),
        line: parseErrorLine(raw),
        elapsedMs: Number((performance.now() - started).toFixed(2)),
        instructionCount: instructions,
        runtime: LUA_RUNTIME,
        luaVersion: LUA_VERSION,
      };
    }

    const top = lua.lua_gettop(L);
    const returns: LuaValue[] = [];
    for (let i = 1; i <= top; i += 1) {
      returns.push(luaValueToJs(L, i));
    }

    return {
      status: "ok",
      stdout,
      returns,
      error: null,
      line: null,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      instructionCount: instructions,
      runtime: LUA_RUNTIME,
      luaVersion: LUA_VERSION,
    };
  } finally {
    lua.lua_close(L);
  }
}
