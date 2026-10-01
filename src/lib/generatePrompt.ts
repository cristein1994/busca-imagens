import type { Character, Instructions, PromptTask } from '../types/studio'
import { blankCharacter, blankInstructions, createId } from './defaults'

export function generatePrompt(
  character: Character,
  instructions: Instructions,
  task: PromptTask,
): string {
  const lines: string[] = []

  lines.push('# SYSTEM PROMPT')
  lines.push('')

  // Identity
  lines.push('## Identidade')
  if (character.name.trim()) {
    lines.push(`Você é **${character.name.trim()}**.`)
  } else {
    lines.push('Você é um assistente de IA especializado.')
  }
  if (character.archetype.trim()) {
    lines.push(`Arquétipo: ${character.archetype.trim()}.`)
  }
  if (character.role.trim()) {
    lines.push(`Papel: ${character.role.trim()}.`)
  }
  if (character.background.trim()) {
    lines.push('')
    lines.push('### Background')
    lines.push(character.background.trim())
  }
  lines.push('')

  // Personality
  lines.push('## Personalidade e voz')
  if (character.personality.length > 0) {
    lines.push(`Traços: ${character.personality.join(', ')}.`)
  }
  lines.push(`Tom dominante: ${character.tone}.`)
  if (character.voice.trim()) {
    lines.push(`Voz: ${character.voice.trim()}`)
  }
  if (character.catchphrases.length > 0) {
    lines.push(
      `Frases características (use com moderação): ${character.catchphrases.map((c) => `"${c}"`).join('; ')}.`,
    )
  }
  if (character.exampleDialogue.trim()) {
    lines.push('')
    lines.push('### Exemplo de fala')
    lines.push(character.exampleDialogue.trim())
  }
  lines.push('')

  // Knowledge
  if (character.knowledge.length > 0) {
    lines.push('## Domínios de conhecimento')
    lines.push(character.knowledge.map((k) => `- ${k}`).join('\n'))
    lines.push('')
  }

  // Boundaries
  if (character.boundaries.length > 0) {
    lines.push('## Limites do personagem')
    lines.push(character.boundaries.map((b) => `- ${b}`).join('\n'))
    lines.push('')
  }

  // Mission / instructions
  lines.push('## Missão e instruções')
  if (instructions.title.trim()) {
    lines.push(`Título da missão: **${instructions.title.trim()}**`)
  }
  if (instructions.mission.trim()) {
    lines.push(instructions.mission.trim())
  }
  if (instructions.audience.trim()) {
    lines.push(`Público-alvo: ${instructions.audience.trim()}.`)
  }
  if (instructions.context.trim()) {
    lines.push('')
    lines.push('### Contexto operacional')
    lines.push(instructions.context.trim())
  }
  lines.push('')
  lines.push(`Formato de saída preferido: **${instructions.outputFormat}**.`)
  lines.push(`Estilo de raciocínio: **${instructions.reasoning}**.`)
  lines.push(`Idioma das respostas: **${character.language || 'português brasileiro'}**.`)
  lines.push('')

  if (instructions.constraints.length > 0) {
    lines.push('### Regras obrigatórias')
    lines.push(instructions.constraints.map((c) => `- ${c}`).join('\n'))
    lines.push('')
  }
  if (instructions.mustInclude.length > 0) {
    lines.push('### Sempre incluir')
    lines.push(instructions.mustInclude.map((c) => `- ${c}`).join('\n'))
    lines.push('')
  }
  if (instructions.mustAvoid.length > 0) {
    lines.push('### Nunca fazer / evitar')
    lines.push(instructions.mustAvoid.map((c) => `- ${c}`).join('\n'))
    lines.push('')
  }
  if (instructions.successCriteria.trim()) {
    lines.push('### Critérios de sucesso')
    lines.push(instructions.successCriteria.trim())
    lines.push('')
  }

  // Task
  lines.push('## Tarefa atual')
  if (task.goal.trim()) {
    lines.push(task.goal.trim())
  } else {
    lines.push('(Defina o objetivo da tarefa no painel Tarefa.)')
  }
  if (task.context.trim()) {
    lines.push('')
    lines.push('### Contexto da tarefa')
    lines.push(task.context.trim())
  }
  if (task.extraNotes.trim()) {
    lines.push('')
    lines.push('### Notas extras')
    lines.push(task.extraNotes.trim())
  }
  lines.push('')
  lines.push(`Extensão desejada: **${task.length}**.`)
  lines.push(`Nível de criatividade: **${task.creativity}/100**.`)
  lines.push('')

  lines.push('## Protocolo de resposta')
  lines.push(
    '1. Permaneça no personagem o tempo todo, salvo se o usuário pedir explicitamente para sair do personagem.',
  )
  lines.push('2. Siga as regras e o formato de saída definidos acima.')
  lines.push('3. Se faltar informação crítica, faça no máximo 2 perguntas objetivas antes de assumir.')
  lines.push('4. Entregue valor concreto na primeira resposta — evite preâmbulos vazios.')

  return lines.join('\n').trim() + '\n'
}

export function generateCompactPrompt(
  character: Character,
  instructions: Instructions,
  task: PromptTask,
): string {
  const parts: string[] = []

  const identity = [
    character.name || 'Assistente',
    character.archetype,
    character.role,
  ]
    .filter(Boolean)
    .join(' — ')

  parts.push(`Você é ${identity}.`)

  if (character.personality.length) {
    parts.push(`Personalidade: ${character.personality.join(', ')}.`)
  }
  parts.push(`Tom: ${character.tone}.`)
  if (character.voice) parts.push(character.voice)

  if (instructions.mission) {
    parts.push(`Missão: ${instructions.mission}`)
  }
  if (instructions.constraints.length) {
    parts.push(`Regras: ${instructions.constraints.join('; ')}.`)
  }
  parts.push(`Formato: ${instructions.outputFormat}. Idioma: ${character.language}.`)

  if (task.goal) {
    parts.push(`Tarefa: ${task.goal}`)
  }
  if (task.context) {
    parts.push(`Contexto: ${task.context}`)
  }

  return parts.filter(Boolean).join('\n\n') + '\n'
}

export function cloneWithNewIds(character: Character, instructions: Instructions) {
  return {
    character: { ...character, id: createId('char') },
    instructions: { ...instructions, id: createId('inst') },
  }
}

export function applyCharacterPreset(partial: Partial<Character>): Character {
  return { ...blankCharacter(), ...partial, id: createId('char') }
}

export function applyInstructionPreset(partial: Partial<Instructions>): Instructions {
  return { ...blankInstructions(), ...partial, id: createId('inst') }
}
