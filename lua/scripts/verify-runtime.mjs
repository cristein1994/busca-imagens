import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);

// Next path alias is not available here — load the compiled-less TS via a tiny CJS probe of fengari.
const fengari = require("fengari");
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

function run(source) {
  const L = lauxlib.luaL_newstate();
  const stdout = [];
  lauxlib.luaL_requiref(L, to_luastring("_G"), lualib.luaopen_base, 1);
  lua.lua_pop(L, 1);
  lauxlib.luaL_requiref(L, to_luastring("string"), lualib.luaopen_string, 1);
  lua.lua_pop(L, 1);
  lauxlib.luaL_requiref(L, to_luastring("math"), lualib.luaopen_math, 1);
  lua.lua_pop(L, 1);

  lua.lua_pushcfunction(L, (state) => {
    const n = lua.lua_gettop(state);
    const parts = [];
    for (let i = 1; i <= n; i += 1) {
      parts.push(to_jsstring(lauxlib.luaL_tolstring(state, i)));
      lua.lua_pop(state, 1);
    }
    stdout.push(parts.join("\t"));
    return 0;
  });
  lua.lua_setglobal(L, to_luastring("print"));

  const status = lauxlib.luaL_dostring(L, to_luastring(source));
  const err = status !== lua.LUA_OK ? lua.lua_tojsstring(L, -1) : null;
  lua.lua_close(L);
  return { ok: status === lua.LUA_OK, stdout, err };
}

const hello = run(`print("olá, lua")`);
if (!hello.ok || hello.stdout[0] !== "olá, lua") {
  console.error("FAIL hello", hello);
  process.exit(1);
}

const boom = run(`error("quebrado")`);
if (boom.ok || !String(boom.err).includes("quebrado")) {
  console.error("FAIL error", boom);
  process.exit(1);
}

const blocked = run(`print(os)`);
if (!blocked.ok) {
  console.error("FAIL sandbox compile", blocked);
  process.exit(1);
}
if (blocked.stdout[0] !== "nil") {
  console.error("FAIL sandbox os should be nil", blocked);
  process.exit(1);
}

console.log("ok", pathToFileURL(root).href);
