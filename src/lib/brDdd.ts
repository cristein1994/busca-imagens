/** DDD → UF / região / cidades principais (dados públicos ANATEL). */
export type DddInfo = {
  ddd: string
  state: string
  region: string
  cities: string[]
}

const DDD_MAP: Record<string, Omit<DddInfo, 'ddd'>> = {
  '11': { state: 'SP', region: 'Sudeste', cities: ['São Paulo', 'Guarulhos', 'Osasco', 'Santo André'] },
  '12': { state: 'SP', region: 'Sudeste', cities: ['São José dos Campos', 'Taubaté', 'Jacareí'] },
  '13': { state: 'SP', region: 'Sudeste', cities: ['Santos', 'São Vicente', 'Guarujá', 'Praia Grande'] },
  '14': { state: 'SP', region: 'Sudeste', cities: ['Bauru', 'Marília', 'Jaú', 'Botucatu'] },
  '15': { state: 'SP', region: 'Sudeste', cities: ['Sorocaba', 'Itapetininga', 'Itu', 'Votorantim'] },
  '16': { state: 'SP', region: 'Sudeste', cities: ['Ribeirão Preto', 'Franca', 'Araraquara', 'São Carlos'] },
  '17': { state: 'SP', region: 'Sudeste', cities: ['São José do Rio Preto', 'Catanduva', 'Votuporanga'] },
  '18': { state: 'SP', region: 'Sudeste', cities: ['Presidente Prudente', 'Araçatuba', 'Assis'] },
  '19': { state: 'SP', region: 'Sudeste', cities: ['Campinas', 'Piracicaba', 'Limeira', 'Americana'] },
  '21': { state: 'RJ', region: 'Sudeste', cities: ['Rio de Janeiro', 'Niterói', 'São Gonçalo', 'Duque de Caxias'] },
  '22': { state: 'RJ', region: 'Sudeste', cities: ['Campos dos Goytacazes', 'Macaé', 'Nova Friburgo'] },
  '24': { state: 'RJ', region: 'Sudeste', cities: ['Volta Redonda', 'Petrópolis', 'Barra Mansa'] },
  '27': { state: 'ES', region: 'Sudeste', cities: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica'] },
  '28': { state: 'ES', region: 'Sudeste', cities: ['Cachoeiro de Itapemirim', 'Linhares'] },
  '31': { state: 'MG', region: 'Sudeste', cities: ['Belo Horizonte', 'Contagem', 'Betim', 'Sete Lagoas'] },
  '32': { state: 'MG', region: 'Sudeste', cities: ['Juiz de Fora', 'Barbacena', 'Ubá'] },
  '33': { state: 'MG', region: 'Sudeste', cities: ['Governador Valadares', 'Teófilo Otoni', 'Caratinga'] },
  '34': { state: 'MG', region: 'Sudeste', cities: ['Uberlândia', 'Uberaba', 'Araguari'] },
  '35': { state: 'MG', region: 'Sudeste', cities: ['Poços de Caldas', 'Varginha', 'Pouso Alegre'] },
  '37': { state: 'MG', region: 'Sudeste', cities: ['Divinópolis', 'Itaúna', 'Formiga'] },
  '38': { state: 'MG', region: 'Sudeste', cities: ['Montes Claros', 'Pirapora', 'Janaúba'] },
  '41': { state: 'PR', region: 'Sul', cities: ['Curitiba', 'São José dos Pinhais', 'Colombo'] },
  '42': { state: 'PR', region: 'Sul', cities: ['Ponta Grossa', 'Guarapuava', 'Castro'] },
  '43': { state: 'PR', region: 'Sul', cities: ['Londrina', 'Arapongas', 'Apucarana'] },
  '44': { state: 'PR', region: 'Sul', cities: ['Maringá', 'Umuarama', 'Campo Mourão'] },
  '45': { state: 'PR', region: 'Sul', cities: ['Cascavel', 'Foz do Iguaçu', 'Toledo'] },
  '46': { state: 'PR', region: 'Sul', cities: ['Francisco Beltrão', 'Pato Branco'] },
  '47': { state: 'SC', region: 'Sul', cities: ['Joinville', 'Blumenau', 'Itajaí', 'Balneário Camboriú'] },
  '48': { state: 'SC', region: 'Sul', cities: ['Florianópolis', 'São José', 'Criciúma'] },
  '49': { state: 'SC', region: 'Sul', cities: ['Chapecó', 'Lages', 'Concórdia'] },
  '51': { state: 'RS', region: 'Sul', cities: ['Porto Alegre', 'Canoas', 'Gravataí', 'Novo Hamburgo'] },
  '53': { state: 'RS', region: 'Sul', cities: ['Pelotas', 'Rio Grande', 'Bagé'] },
  '54': { state: 'RS', region: 'Sul', cities: ['Caxias do Sul', 'Passo Fundo', 'Bento Gonçalves'] },
  '55': { state: 'RS', region: 'Sul', cities: ['Santa Maria', 'Uruguaiana', 'Santana do Livramento'] },
  '61': { state: 'DF', region: 'Centro-Oeste', cities: ['Brasília', 'Luziânia', 'Valparaíso de Goiás'] },
  '62': { state: 'GO', region: 'Centro-Oeste', cities: ['Goiânia', 'Anápolis', 'Aparecida de Goiânia'] },
  '63': { state: 'TO', region: 'Norte', cities: ['Palmas', 'Araguaína', 'Gurupi'] },
  '64': { state: 'GO', region: 'Centro-Oeste', cities: ['Rio Verde', 'Jataí', 'Catalão'] },
  '65': { state: 'MT', region: 'Centro-Oeste', cities: ['Cuiabá', 'Várzea Grande', 'Rondonópolis'] },
  '66': { state: 'MT', region: 'Centro-Oeste', cities: ['Rondonópolis', 'Sinop', 'Sorriso'] },
  '67': { state: 'MS', region: 'Centro-Oeste', cities: ['Campo Grande', 'Dourados', 'Três Lagoas'] },
  '68': { state: 'AC', region: 'Norte', cities: ['Rio Branco', 'Cruzeiro do Sul'] },
  '69': { state: 'RO', region: 'Norte', cities: ['Porto Velho', 'Ji-Paraná', 'Ariquemes'] },
  '71': { state: 'BA', region: 'Nordeste', cities: ['Salvador', 'Lauro de Freitas', 'Camaçari'] },
  '73': { state: 'BA', region: 'Nordeste', cities: ['Ilhéus', 'Itabuna', 'Porto Seguro'] },
  '74': { state: 'BA', region: 'Nordeste', cities: ['Juazeiro', 'Jacobina', 'Senhor do Bonfim'] },
  '75': { state: 'BA', region: 'Nordeste', cities: ['Feira de Santana', 'Alagoinhas', 'Santo Antônio de Jesus'] },
  '77': { state: 'BA', region: 'Nordeste', cities: ['Vitória da Conquista', 'Barreiras', 'Guanambi'] },
  '79': { state: 'SE', region: 'Nordeste', cities: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto'] },
  '81': { state: 'PE', region: 'Nordeste', cities: ['Recife', 'Olinda', 'Jaboatão dos Guararapes'] },
  '82': { state: 'AL', region: 'Nordeste', cities: ['Maceió', 'Arapiraca', 'Rio Largo'] },
  '83': { state: 'PB', region: 'Nordeste', cities: ['João Pessoa', 'Campina Grande', 'Patos'] },
  '84': { state: 'RN', region: 'Nordeste', cities: ['Natal', 'Mossoró', 'Parnamirim'] },
  '85': { state: 'CE', region: 'Nordeste', cities: ['Fortaleza', 'Caucaia', 'Maracanaú'] },
  '86': { state: 'PI', region: 'Nordeste', cities: ['Teresina', 'Parnaíba', 'Picos'] },
  '87': { state: 'PE', region: 'Nordeste', cities: ['Petrolina', 'Garanhuns', 'Caruaru'] },
  '88': { state: 'CE', region: 'Nordeste', cities: ['Juazeiro do Norte', 'Sobral', 'Crato'] },
  '89': { state: 'PI', region: 'Nordeste', cities: ['Picos', 'Floriano', 'São Raimundo Nonato'] },
  '91': { state: 'PA', region: 'Norte', cities: ['Belém', 'Ananindeua', 'Castanhal'] },
  '92': { state: 'AM', region: 'Norte', cities: ['Manaus', 'Itacoatiara', 'Parintins'] },
  '93': { state: 'PA', region: 'Norte', cities: ['Santarém', 'Altamira', 'Itaituba'] },
  '94': { state: 'PA', region: 'Norte', cities: ['Marabá', 'Parauapebas', 'Tucuruí'] },
  '95': { state: 'RR', region: 'Norte', cities: ['Boa Vista', 'Rorainópolis'] },
  '96': { state: 'AP', region: 'Norte', cities: ['Macapá', 'Santana'] },
  '97': { state: 'AM', region: 'Norte', cities: ['Coari', 'Tefé', 'Manacapuru'] },
  '98': { state: 'MA', region: 'Nordeste', cities: ['São Luís', 'São José de Ribamar', 'Paço do Lumiar'] },
  '99': { state: 'MA', region: 'Nordeste', cities: ['Imperatriz', 'Caxias', 'Timon'] },
}

export function lookupBrDdd(nationalNumber: string): DddInfo | null {
  const digits = nationalNumber.replace(/\D/g, '')
  if (digits.length < 10) return null
  const ddd = digits.slice(0, 2)
  const info = DDD_MAP[ddd]
  if (!info) return null
  return { ddd, ...info }
}

export function listKnownDdds(): DddInfo[] {
  return Object.entries(DDD_MAP)
    .map(([ddd, info]) => ({ ddd, ...info }))
    .sort((a, b) => a.ddd.localeCompare(b.ddd))
}
