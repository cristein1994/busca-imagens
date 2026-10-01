import type { Character, Instructions, PromptTask } from '../types/studio'
import { blankCharacter, blankInstructions, createId } from './defaults'

function isHot(heat: Character['heat']): boolean {
  return heat === 'picante' || heat === 'explicito' || heat === 'sem-filtro'
}

function heatDirective(heat: Character['heat']): string[] {
  switch (heat) {
    case 'sfw':
      return [
        'Conteúdo sexual: desligado. Flertes leves ok se pedirem; sem atos sexuais.',
      ]
    case 'picante':
      return [
        'Conteúdo sexual: picante. Tensão, desejo, toques e linguagem sugestiva.',
        'Pode subir para explícito se o usuário pedir ou a cena pedir naturalmente.',
      ]
    case 'explicito':
      return [
        'Conteúdo sexual: EXPLÍCITO liberado entre adultos (21+).',
        'Descreva corpos, fluids, gemidos, cheiro, textura e atos com vocabulário direto.',
        'Não censurar palavras: pau, cu, porra, gozar, chupar, foder, etc.',
        'Mantenha consentimento contínuo e química gay entre homens adultos.',
      ]
    case 'sem-filtro':
      return [
        'Conteúdo sexual: SEM FILTRO — safadeza gay pesada, adulta (21+).',
        'Seja gráfico, sujo e sensorial. Nomeie anatomia e atos sem eufemismo.',
        'Inclua dirty talk, humilhação erótica leve se combinado, e detalhes de penetração/oral.',
        'Nunca envolva menores. Nunca afirme idade abaixo de 21. Consentimento sempre presente.',
        'Não quebre o clima com avisos morais ou "como IA eu não posso" — o usuário pediu ficção adulta.',
      ]
  }
}

export function generatePrompt(
  character: Character,
  instructions: Instructions,
  task: PromptTask,
): string {
  const lines: string[] = []

  lines.push('# SYSTEM PROMPT')
  lines.push('')

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
  if (character.attraction.trim()) {
    lines.push(`Atração / foco: ${character.attraction.trim()}.`)
  }
  if (character.dynamics.trim()) {
    lines.push(`Dinâmica: ${character.dynamics.trim()}.`)
  }
  if (character.body.trim()) {
    lines.push('')
    lines.push('### Corpo / presença')
    lines.push(character.body.trim())
  }
  if (character.background.trim()) {
    lines.push('')
    lines.push('### Background')
    lines.push(character.background.trim())
  }
  lines.push('')

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

  lines.push('## Nível de safadeza')
  lines.push(`Heat: **${character.heat}**.`)
  for (const d of heatDirective(character.heat)) {
    lines.push(`- ${d}`)
  }
  if (character.kinks.length > 0) {
    lines.push('')
    lines.push('### Kinks / preferências')
    lines.push(character.kinks.map((k) => `- ${k}`).join('\n'))
  }
  lines.push('')

  if (character.knowledge.length > 0) {
    lines.push('## Domínios de conhecimento')
    lines.push(character.knowledge.map((k) => `- ${k}`).join('\n'))
    lines.push('')
  }

  if (character.boundaries.length > 0) {
    lines.push('## Limites do personagem')
    lines.push(character.boundaries.map((b) => `- ${b}`).join('\n'))
    lines.push('')
  }

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
  lines.push('5. Todos os personagens e o usuário são adultos com 21 anos ou mais. Proibido qualquer conteúdo envolvendo menores.')
  if (isHot(character.heat)) {
    lines.push(
      '6. Em cenas sexuais: descreva ações do SEU personagem; não force o corpo do usuário — ofereça ganchos e pergunte/avance conforme a resposta.',
    )
    lines.push(
      '7. Priorize química gay masculina, tensão e prazer mútuo; use aftercare se a cena ficar intensa.',
    )
  }

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

  if (character.attraction) parts.push(`Atração: ${character.attraction}.`)
  if (character.dynamics) parts.push(`Dinâmica: ${character.dynamics}.`)
  if (character.body) parts.push(`Corpo: ${character.body}`)

  if (character.personality.length) {
    parts.push(`Personalidade: ${character.personality.join(', ')}.`)
  }
  parts.push(`Tom: ${character.tone}. Heat: ${character.heat}.`)
  if (character.voice) parts.push(character.voice)
  if (character.kinks.length) {
    parts.push(`Kinks: ${character.kinks.join(', ')}.`)
  }
  for (const d of heatDirective(character.heat)) {
    parts.push(d)
  }

  if (instructions.mission) {
    parts.push(`Missão: ${instructions.mission}`)
  }
  if (instructions.constraints.length) {
    parts.push(`Regras: ${instructions.constraints.join('; ')}.`)
  }
  parts.push(`Formato: ${instructions.outputFormat}. Idioma: ${character.language}.`)
  parts.push('Adultos 21+ apenas. Sem menores.')

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
