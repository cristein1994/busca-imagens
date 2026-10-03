declare module "fengari" {
  export const lua: {
    LUA_OK: number;
    LUA_YIELD: number;
    LUA_ERRRUN: number;
    LUA_ERRSYNTAX: number;
    LUA_ERRMEM: number;
    LUA_ERRGCMM: number;
    LUA_ERRERR: number;
    LUA_TNONE: number;
    LUA_TNIL: number;
    LUA_TBOOLEAN: number;
    LUA_TLIGHTUSERDATA: number;
    LUA_TNUMBER: number;
    LUA_TSTRING: number;
    LUA_TTABLE: number;
    LUA_TFUNCTION: number;
    LUA_TUSERDATA: number;
    LUA_TTHREAD: number;
    LUA_MULTRET: number;
    LUA_MASKCOUNT: number;
    lua_gettop(L: LuaState): number;
    lua_settop(L: LuaState, idx: number): void;
    lua_pop(L: LuaState, n: number): void;
    lua_type(L: LuaState, idx: number): number;
    lua_typename(L: LuaState, tp: number): LuaString;
    lua_toboolean(L: LuaState, idx: number): boolean;
    lua_tonumber(L: LuaState, idx: number): number;
    lua_tojsstring(L: LuaState, idx: number): string | undefined;
    lua_pushcfunction(L: LuaState, fn: (L: LuaState) => number): void;
    lua_pushstring(L: LuaState, s: LuaString): void;
    lua_pushliteral(L: LuaState, s: string): void;
    lua_pushnil(L: LuaState): void;
    lua_pushnumber(L: LuaState, n: number): void;
    lua_pushboolean(L: LuaState, b: boolean): void;
    lua_setglobal(L: LuaState, name: LuaString): void;
    lua_getglobal(L: LuaState, name: LuaString): number;
    lua_sethook(
      L: LuaState,
      hook: (L: LuaState, ar: unknown) => void,
      mask: number,
      count: number,
    ): void;
    lua_next(L: LuaState, idx: number): number;
    lua_pushvalue(L: LuaState, idx: number): void;
    lua_isnil(L: LuaState, idx: number): boolean;
    lua_isstring(L: LuaState, idx: number): boolean;
    lua_isnumber(L: LuaState, idx: number): boolean;
    lua_istable(L: LuaState, idx: number): boolean;
    lua_close(L: LuaState): void;
    lua_call(L: LuaState, nargs: number, nresults: number): void;
    lua_pcall(L: LuaState, nargs: number, nresults: number, msgh: number): number;
  };

  export const lauxlib: {
    luaL_newstate(): LuaState;
    luaL_dostring(L: LuaState, s: LuaString): number;
    luaL_tolstring(L: LuaState, idx: number): LuaString;
    luaL_requiref(
      L: LuaState,
      name: LuaString,
      fn: (L: LuaState) => number,
      glb: number,
    ): void;
    luaL_error(L: LuaState, fmt: LuaString): number;
    luaL_loadstring(L: LuaState, s: LuaString): number;
  };

  export const lualib: {
    luaopen_base(L: LuaState): number;
    luaopen_coroutine(L: LuaState): number;
    luaopen_table(L: LuaState): number;
    luaopen_string(L: LuaState): number;
    luaopen_math(L: LuaState): number;
    luaopen_utf8(L: LuaState): number;
    luaopen_io(L: LuaState): number;
    luaopen_os(L: LuaState): number;
    luaopen_package(L: LuaState): number;
    luaopen_debug(L: LuaState): number;
    luaL_openlibs(L: LuaState): void;
  };

  export type LuaState = object;
  export type LuaString = Uint8Array;

  export function to_luastring(s: string, cache?: boolean): LuaString;
  export function to_jsstring(s: LuaString | string): string;
}
