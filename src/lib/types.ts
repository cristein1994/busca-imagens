export type QsaMember = {
  identificador_de_socio?: number;
  nome_socio?: string;
  cnpj_cpf_do_socio?: string;
  codigo_qualificacao_socio?: number;
  qualificacao_socio?: string;
  data_entrada_sociedade?: string;
  pais?: string;
  representante_legal?: string;
  nome_representante_legal?: string;
  qualificacao_representante_legal?: string;
};

export type Cnae = {
  codigo?: number | string;
  descricao?: string;
};

export type CnpjCompany = {
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao_cadastral?: number | string;
  descricao_situacao_cadastral?: string;
  data_situacao_cadastral?: string;
  motivo_situacao_cadastral?: number | string;
  descricao_motivo_situacao_cadastral?: string;
  data_inicio_atividade?: string;
  cnae_fiscal?: number | string;
  cnae_fiscal_descricao?: string;
  cnaes_secundarios?: Cnae[];
  natureza_juridica?: string;
  codigo_natureza_juridica?: number | string;
  descricao_natureza_juridica?: string;
  porte?: string;
  descricao_porte?: string;
  capital_social?: number;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  ddd_telefone_1?: string;
  telefone_1?: string;
  ddd_telefone_2?: string;
  telefone_2?: string;
  email?: string;
  qsa?: QsaMember[];
};

export type LookupOk = { ok: true; data: CnpjCompany };
export type LookupErr = { ok: false; error: string; status?: number };
export type LookupResult = LookupOk | LookupErr;
