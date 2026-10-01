import type { Character, Instructions, PromptTask } from '../types/studio'

export function createId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function blankCharacter(): Character {
  return {
    id: createId('char'),
    name: '',
    archetype: '',
    role: '',
    personality: [],
    tone: 'direto',
    voice: '',
    background: '',
    knowledge: [],
    boundaries: [],
    catchphrases: [],
    exampleDialogue: '',
    language: 'português brasileiro',
  }
}

export function blankInstructions(): Instructions {
  return {
    id: createId('inst'),
    title: '',
    mission: '',
    audience: '',
    outputFormat: 'markdown',
    reasoning: 'explicito',
    constraints: [],
    mustInclude: [],
    mustAvoid: [],
    successCriteria: '',
    context: '',
  }
}

export function blankTask(): PromptTask {
  return {
    goal: '',
    context: '',
    extraNotes: '',
    length: 'medio',
    creativity: 55,
  }
}

export const TONE_LABELS: Record<Character['tone'], string> = {
  formal: 'Formal',
  casual: 'Casual',
  tecnico: 'Técnico',
  poetico: 'Poético',
  direto: 'Direto',
  empatico: 'Empático',
  humoristico: 'Humorístico',
  autoritario: 'Autoritário',
}

export const FORMAT_LABELS: Record<Instructions['outputFormat'], string> = {
  livre: 'Livre',
  markdown: 'Markdown',
  bullets: 'Lista de bullets',
  json: 'JSON estruturado',
  'passo-a-passo': 'Passo a passo',
  tabela: 'Tabela',
  dialogo: 'Diálogo',
  codigo: 'Código',
}

export const REASONING_LABELS: Record<Instructions['reasoning'], string> = {
  rapido: 'Rápido e objetivo',
  explicito: 'Raciocínio explícito',
  socratico: 'Socrático (perguntas)',
  critico: 'Crítico e analítico',
  criativo: 'Criativo e exploratório',
}

export const LENGTH_LABELS: Record<PromptTask['length'], string> = {
  curto: 'Curto',
  medio: 'Médio',
  longo: 'Longo',
  'sem-limite': 'Sem limite',
}

export const PERSONALITY_SUGGESTIONS = [
  'curioso',
  'paciente',
  'sarcástico',
  'metódico',
  'visionário',
  'prático',
  'caloroso',
  'cético',
  'entusiasta',
  'diplomático',
  'incisivo',
  'mentor',
]

export const KNOWLEDGE_SUGGESTIONS = [
  'programação',
  'design de produto',
  'marketing',
  'escrita criativa',
  'ciência de dados',
  'educação',
  'negócios',
  'UX/UI',
  'psicologia',
  'história',
]
