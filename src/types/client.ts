export type ClientRecord = {
  id: string
  nome: string
  cpf: string
  email: string
  telefone: string
  cidade: string
  notas: string
}

export type SearchField = 'todos' | 'cpf' | 'email' | 'telefone' | 'nome'
