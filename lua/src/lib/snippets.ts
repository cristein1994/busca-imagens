export type Snippet = {
  id: string;
  title: string;
  blurb: string;
  phase: "nova" | "crescente" | "cheia" | "minguante";
  source: string;
};

export const SNIPPETS: Snippet[] = [
  {
    id: "ola",
    title: "Olá, Lua",
    blurb: "Primeiro print no ateliê",
    phase: "nova",
    source: `-- Wii Lua · primeiro claro
local nome = "Michel"

print("Olá, " .. nome)
print("Este é o Ateliê Lunar.")
print("Lua " .. _VERSION)
`,
  },
  {
    id: "fatorial",
    title: "Fatorial",
    blurb: "Recursão clássica",
    phase: "crescente",
    source: `-- Fatorial recursivo
local function fat(n)
  if n < 0 then
    error("n precisa ser >= 0")
  end
  if n <= 1 then
    return 1
  end
  return n * fat(n - 1)
end

for i = 0, 8 do
  print(string.format("fat(%d) = %d", i, fat(i)))
end
`,
  },
  {
    id: "tabelas",
    title: "Tabelas",
    blurb: "Lista, mapa e ipairs",
    phase: "crescente",
    source: `-- Tabelas são o único tipo composto
local fases = { "nova", "crescente", "cheia", "minguante" }

print("Fases da lua:")
for i, fase in ipairs(fases) do
  print(i, fase)
end

local atelier = {
  nome = "Wii Lua",
  projeto = "wii",
  autor = "Michel Silva",
}

print("")
print("Ateliê:")
for chave, valor in pairs(atelier) do
  print(chave .. " → " .. valor)
end
`,
  },
  {
    id: "fibonacci",
    title: "Fibonacci",
    blurb: "Sequência até n",
    phase: "cheia",
    source: `-- Fibonacci iterativo
local function fib(n)
  local a, b = 0, 1
  local seq = {}
  for i = 1, n do
    seq[i] = a
    a, b = b, a + b
  end
  return seq
end

local seq = fib(12)
print(table.concat(seq, ", "))
`,
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    blurb: "Múltiplos de 3 e 5",
    phase: "cheia",
    source: `-- FizzBuzz até 30
for n = 1, 30 do
  local out = ""
  if n % 3 == 0 then out = out .. "Fizz" end
  if n % 5 == 0 then out = out .. "Buzz" end
  if out == "" then out = tostring(n) end
  print(out)
end
`,
  },
  {
    id: "padroes",
    title: "Padrões",
    blurb: "string.gmatch e gsub",
    phase: "minguante",
    source: `-- Padrões de string (não são regex)
local verso = "a lua guarda o verso no bolso da noite"

print("Palavras:")
for palavra in string.gmatch(verso, "%S+") do
  print("- " .. palavra)
end

local trocado = string.gsub(verso, "lua", "Lua")
print("")
print(trocado)
print("letras:", #verso)
`,
  },
  {
    id: "fechamentos",
    title: "Fechamentos",
    blurb: "Gerador com closure",
    phase: "minguante",
    source: `-- Closure: o gerador lembra o estado
local function contador(inicio)
  local n = inicio or 0
  return function()
    n = n + 1
    return n
  end
end

local proximo = contador(10)
for _ = 1, 5 do
  print("próximo:", proximo())
end
`,
  },
  {
    id: "metatable",
    title: "Metatable",
    blurb: "Objeto com __tostring",
    phase: "cheia",
    source: `-- Um objeto simples com metatable
local Lua = {}
Lua.__index = Lua

function Lua.nova(fase, idade)
  return setmetatable({
    fase = fase,
    idade = idade,
  }, Lua)
end

function Lua:__tostring()
  return string.format("lua %s · %d dias", self.fase, self.idade)
end

function Lua:cresce()
  self.idade = self.idade + 1
  return self
end

local hoje = Lua.nova("crescente", 7)
hoje:cresce():cresce()
print(hoje)
print("idade", hoje.idade)
`,
  },
];

export const DEFAULT_SNIPPET_ID = "ola";

export function snippetById(id: string): Snippet | undefined {
  return SNIPPETS.find((s) => s.id === id);
}
