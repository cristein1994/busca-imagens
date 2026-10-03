export type RunStatus = "ok" | "error" | "timeout" | "invalid";

export type LuaValue =
  | string
  | number
  | boolean
  | null
  | LuaValue[]
  | { [key: string]: LuaValue };

export type RunRequest = {
  source: string;
};

export type RunResponse = {
  status: RunStatus;
  stdout: string[];
  returns: LuaValue[];
  error: string | null;
  line: number | null;
  elapsedMs: number;
  instructionCount: number;
  runtime: "fengari";
  luaVersion: "5.3";
};

export type HealthResponse = {
  ok: true;
  name: string;
  runtime: "fengari";
  luaVersion: "5.3";
  maxInstructions: number;
  maxSourceBytes: number;
};
