import type { ClientRecord } from '../types/client'

/** Dados fictícios só para demonstração — não são pessoas reais. */
export const DEMO_CLIENTS: ClientRecord[] = [
  {
    id: 'demo-1',
    nome: 'Ana Demo Silva',
    cpf: '000.000.001-91',
    email: 'ana.demo@example.com',
    telefone: '(11) 90000-0001',
    cidade: 'São Paulo · SP',
    notas: 'Registro de exemplo — substitua pelo seu CSV.',
  },
  {
    id: 'demo-2',
    nome: 'Bruno Exemplo Costa',
    cpf: '000.000.002-72',
    email: 'bruno.exemplo@example.com',
    telefone: '(21) 90000-0002',
    cidade: 'Rio de Janeiro · RJ',
    notas: 'Fictício. Importe sua planilha para ver clientes reais.',
  },
  {
    id: 'demo-3',
    nome: 'Carla Sample Oliveira',
    cpf: '000.000.003-53',
    email: 'carla.sample@example.com',
    telefone: '(31) 90000-0003',
    cidade: 'Belo Horizonte · MG',
    notas: 'Nada aqui consulta CPF externo.',
  },
]
