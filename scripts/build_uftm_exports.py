#!/usr/bin/env python3
"""Build UFTM LinkedIn public-people exports under /workspace/data."""

from __future__ import annotations

import csv
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from openpyxl import Workbook

OUT = Path("/workspace/data")
OUT.mkdir(parents=True, exist_ok=True)

MALE = {
    "alan",
    "alex",
    "anderson",
    "andre",
    "andré",
    "antonio",
    "antônio",
    "aramis",
    "arthur",
    "augusto",
    "bruno",
    "caio",
    "carlos",
    "cesar",
    "césar",
    "daniel",
    "danilo",
    "diego",
    "douglas",
    "eduardo",
    "eli",
    "emerson",
    "evandro",
    "fabio",
    "fábio",
    "felipe",
    "fernando",
    "francisco",
    "gabriel",
    "guilherme",
    "gustavo",
    "henrique",
    "igor",
    "joao",
    "joão",
    "jose",
    "josé",
    "julio",
    "júlio",
    "leandro",
    "leonardo",
    "lucas",
    "luis",
    "luís",
    "luiz",
    "marcelo",
    "marcus",
    "mateus",
    "matheus",
    "mauricio",
    "maurício",
    "miguel",
    "murilo",
    "nicholas",
    "nicolas",
    "otavio",
    "otávio",
    "paulo",
    "pedro",
    "rafael",
    "renato",
    "ricardo",
    "roberto",
    "rodrigo",
    "samuel",
    "saulo",
    "sergio",
    "sérgio",
    "thiago",
    "tiago",
    "victor",
    "vinicius",
    "vinícius",
    "vitor",
    "vítor",
    "wagner",
    "wesley",
    "willian",
    "william",
    "yago",
    "heitor",
    "enzo",
    "davi",
    "bryan",
    "benjamin",
    "bernardo",
    "cauã",
    "caua",
    "kaique",
    "kaike",
    "lorenzo",
    "vicente",
}

FEMALE = {
    "adriana",
    "agata",
    "ágata",
    "alanys",
    "alice",
    "aline",
    "amalia",
    "amália",
    "amanda",
    "ana",
    "andreia",
    "andréia",
    "angela",
    "ângela",
    "anna",
    "beatriz",
    "bianca",
    "bruna",
    "camila",
    "carla",
    "carolina",
    "caroline",
    "clara",
    "claudia",
    "cláudia",
    "cristina",
    "daniela",
    "debora",
    "débora",
    "diovanna",
    "eduarda",
    "elaine",
    "eliane",
    "elisa",
    "emanuelle",
    "emily",
    "ester",
    "estefani",
    "eva",
    "fabiane",
    "fabiana",
    "fernanda",
    "flavia",
    "flávia",
    "gabriela",
    "gabriella",
    "giovana",
    "giovanna",
    "helena",
    "isabela",
    "isabella",
    "isadora",
    "jessica",
    "jéssica",
    "julia",
    "júlia",
    "juliana",
    "karina",
    "ketulyn",
    "larissa",
    "laura",
    "leticia",
    "letícia",
    "lidia",
    "lídia",
    "livia",
    "lívia",
    "lorena",
    "luana",
    "lucia",
    "lúcia",
    "luciana",
    "luiza",
    "manuela",
    "marcela",
    "maria",
    "mariana",
    "marielle",
    "marina",
    "marta",
    "melissa",
    "michelle",
    "milena",
    "monica",
    "mônica",
    "nathalia",
    "natália",
    "natalia",
    "nicole",
    "nyna",
    "patricia",
    "patrícia",
    "paula",
    "priscila",
    "rafaela",
    "raissa",
    "raíssa",
    "rebeca",
    "renata",
    "sabrina",
    "samara",
    "sandra",
    "sara",
    "sofia",
    "sophia",
    "stefany",
    "talita",
    "tatiane",
    "thais",
    "thaís",
    "valentina",
    "vanessa",
    "vitoria",
    "vitória",
    "wanessa",
    "yasmin",
    "yanna",
    "raiana",
    "victoria",
    "viviane",
    "brenda",
    "barbara",
    "bárbara",
    "catarina",
    "cecilia",
    "cecília",
    "denise",
    "eloa",
    "eloá",
    "heloisa",
    "heloísa",
    "ingrid",
    "isis",
    "jacqueline",
    "janaina",
    "janaína",
    "joana",
    "joyce",
    "karla",
    "lais",
    "laís",
    "lara",
    "ligia",
    "lígia",
    "michele",
    "nayara",
    "nubia",
    "núbia",
    "olivia",
    "olívia",
    "pamela",
    "pâmela",
    "poliana",
    "rosana",
    "silvia",
    "sílvia",
    "simone",
    "suelen",
    "suzana",
    "tatiana",
    "tereza",
    "veronica",
    "verônica",
}


def first_name(full: str) -> str:
    parts = re.split(r"\s+", full.strip())
    return parts[0] if parts else ""


def gender_guess(full: str) -> str:
    fn = first_name(full).lower()
    if fn in MALE:
        return "male"
    if fn in FEMALE:
        return "female"
    return "unknown"


COLS = [
    "fullName",
    "title",
    "courseOrRole",
    "location",
    "linkedinUrl",
    "email",
    "status",
]

PEOPLE_RAW = [
    dict(
        fullName="Pedro Henrique Costa Cordeiro",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Engenharia Ambiental (2021–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/pedro-henrique-costa-cordeiro-660165226",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Julia Alvim",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Nutrição (2024–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/julia-alvim-4a1128318",
        email="",
        status="student",
        notes="AlimenTRI Jr. marketing",
    ),
    dict(
        fullName="Ana Lídia Teixeira",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Ciências Biomédicas / Biomedicina (2023–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/ana-l%C3%ADdia-teixeira-b0233332a",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Saulo Domingos Custódio Junior",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Biomedicina (2024–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/saulo-domingos-cust%C3%B3dio-junior-737430304",
        email="",
        status="student",
        notes="Ligante Hematologia e Terapia Celular",
    ),
    dict(
        fullName="Livia Urbano",
        title="Graduanda de Biomedicina na UFTM",
        courseOrRole="Biomedicina (2022–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/livia-urbano-60119b1b0",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Isabella Coutinho",
        title="Estudante de Engenharia Ambiental | Pesquisa e Desenvolvimento",
        courseOrRole="Engenharia Ambiental e Sanitária (2021–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/isabella-coutinho-914a8a209",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Julia Santos",
        title="Estudante de Licenciatura em Matemática na UFTM",
        courseOrRole="Licenciatura em Matemática (2022–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/julia-santos-a6137b264",
        email="",
        status="student",
        notes="Presidente Centro Acadêmico Matemática",
    ),
    dict(
        fullName="Lorena Sabo",
        title="Estudante de Graduação de Engenharia de Alimentos - UFTM",
        courseOrRole="Engenharia de Alimentos (2023–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/lorena-sabo-a38015357",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Estefani Maia",
        title="Graduanda em Engenharia Agronômica",
        courseOrRole="Engenharia Agronômica (cursando; bolsista FAPEMIG)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/estefani-maia-3b7b41330",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Yanna L.",
        title="Graduando em Ciências Biológicas - UFTM e UX/UI Design - EBAC",
        courseOrRole="Licenciatura em Ciências Biológicas (2022–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/yannarl18",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Gabriella Moura Ferreira",
        title="Graduanda de Engenharia Química | UFTM",
        courseOrRole="Engenharia Química (cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/gabriella-ferreira-009525284",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Gabriel Barbosa",
        title="Graduando na instituição de ensino UFTM",
        courseOrRole="Engenharia Elétrica (cursando; EJEET)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/gabriel-barbosa-0ab437320",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Sabrina Santos",
        title="Acadêmica de Medicina na UFTM",
        courseOrRole="Medicina (2022–2027)",
        location="Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/sabrina-santos-827a31220",
        email="",
        status="student",
        notes="7º período",
    ),
    dict(
        fullName="Eduarda Solidade",
        title="Estudante de medicina na Universidade Federal do Triângulo Mineiro",
        courseOrRole="Medicina (2021–2027)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/eduarda-solidade-897901107",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Gabriela Adami",
        title="Estudante de Medicina na UFTM",
        courseOrRole="Medicina (cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/gabriela-adami-3b088237",
        email="",
        status="student",
        notes="Bacharel em Química Tecnológica (UFSCar)",
    ),
    dict(
        fullName="Fabiane Fernandes da Silva",
        title="Acadêmica de Medicina na UFTM",
        courseOrRole="Medicina (cursando; 12º período)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/fabiane-fernandes-da-silva-a662812a9",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Marielle Puchinques Pereira",
        title="Graduanda em Medicina pela UFTM",
        courseOrRole="Medicina (2025–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/marielle-puchinques-pereira-b40015201",
        email="",
        status="student",
        notes="Bacharel/Licenciatura Enfermagem USP",
    ),
    dict(
        fullName="Diovanna Soares",
        title="Estudante de medicina da instituição de ensino UFTM",
        courseOrRole="Medicina (2024–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/diovanna-soares-77b68331b",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Caio Gabriel de Andrade Miranda",
        title="Aluno de Medicina na UFTM",
        courseOrRole="Medicina (cursando; PET-Medicina)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/caio-gabriel-de-andrade-miranda",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Laura Canesin",
        title="Graduanda em Engenharia Civil pela UFTM",
        courseOrRole="Engenharia Civil (cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/laura-canesin-892b36330",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Gabriella M.",
        title="Graduando em Engenharia Civil - UFTM",
        courseOrRole="Engenharia Civil (2021–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/gabriellamalaquias",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Matheus Martins",
        title="Graduando em Engenharia Civil pela UFTM e Analista de Projetos pela WEG",
        courseOrRole="Engenharia Civil (2019–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/mthsmds",
        email="",
        status="student",
        notes="Ponte Triângulo UFTM",
    ),
    dict(
        fullName="Lucas Lopes",
        title="Graduando em Engenharia Civil - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Engenharia Civil (cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/lucas-lopes-407850226",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Gustavo Firmino",
        title="Graduando em Engenharia Mecânica | CAE | CAM",
        courseOrRole="Engenharia Mecânica (2022–2027)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/gustavo-firmino-a73b66283",
        email="",
        status="student",
        notes="Zebu Baja UFTM",
    ),
    dict(
        fullName="Vicente Cecilio de Paula",
        title="Estudante de Engenharia Mecânica na UFTM",
        courseOrRole="Engenharia Mecânica (2022–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/vicente-cecilio-de-paula-9a3779283",
        email="",
        status="student",
        notes="9º período",
    ),
    dict(
        fullName="Thiago Camargo Dias",
        title="Graduando Engenharia Mecânica - UFTM",
        courseOrRole="Engenharia Mecânica (cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/thiagocdias",
        email="",
        status="student",
        notes="MECTRIA EJ",
    ),
    dict(
        fullName="Camila Dourado",
        title="Graduanda em Psicologia e Técnica de Enfermagem",
        courseOrRole="Psicologia (2021–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/camila-dourado",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Nyna Marques",
        title="Estudante de Psicologia da UFTM",
        courseOrRole="Psicologia (2022–2027)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/nyna-marques-3332b72a9",
        email="",
        status="student",
        notes="Innovare Jr.",
    ),
    dict(
        fullName="Julia Guimarães",
        title="Estudante de Terapia Ocupacional na UFTM",
        courseOrRole="Terapia Ocupacional (cursando; 4º período)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/julia-guimar%C3%A3es-6aa056203",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Mariana Maia",
        title="Graduanda em Terapia Ocupacional na UFTM (8° Período)",
        courseOrRole="Terapia Ocupacional (2020–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/mariana-maia-25a70a286",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Isabella Caroline S. Guimarães",
        title="Graduanda em Terapia Ocupacional - UFTM",
        courseOrRole="Terapia Ocupacional (2019–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/isabella-caroline-s-guimar%C3%A3es-494124210",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Amanda Santos",
        title="Estudante de Terapia Ocupacional/Técnica em Administração",
        courseOrRole="Terapia Ocupacional (cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/amanda-santos-8391531b6",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Vinicius Mataraia",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Engenharia de Produção (2022–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/vinicius-mataraia-a387a1331",
        email="",
        status="student",
        notes="PROJEP / SEGEP",
    ),
    dict(
        fullName="Rafael Marques",
        title="Graduando de Engenharia de Produção na UFTM",
        courseOrRole="Engenharia de Produção (2020–cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/rafael-marques-3b5240246",
        email="",
        status="student",
        notes="Ex-presidente SEGEP",
    ),
    dict(
        fullName="Eli Vinícius",
        title="Graduando de Engenharia de Produção - UFTM",
        courseOrRole="Engenharia de Produção (cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/eli-vinicius",
        email="",
        status="student",
        notes="Monitor PCP1",
    ),
    dict(
        fullName="Ketulyn Gama",
        title="Graduanda em Engenharia de Produção",
        courseOrRole="Engenharia de Produção (2023–2027)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/ketulyn-gama",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Guilherme Valini Penha",
        title="Estudante de Engenharia de Produção - UFTM",
        courseOrRole="Engenharia de Produção (2023–Present)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/guilhermevalinipenha",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Guilherme Ficher",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Engenharia de Produção (2020–2026)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/guilherme-ficher-116327219",
        email="",
        status="student",
        notes="",
    ),
    dict(
        fullName="Gabriela Lopes Cançado",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Graduação UFTM (2023–2027)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/gabriela-lopes-can%C3%A7ado-96863a30a",
        email="",
        status="student",
        notes="Course not named in public snippet",
    ),
    dict(
        fullName="Anna Gabriella Martins Pires",
        title="Estudante de Nutrição | AlimenTRI Jr.",
        courseOrRole="Nutrição (cursando)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/anna-gabriella-martins-pires-a799aa2ba",
        email="",
        status="student",
        notes="AlimenTRI Jr. VP/Gestão de Gente",
    ),
    dict(
        fullName="Evandro Moroni Junior",
        title="Mechanical Engineering - UFTM | Dual Degree ENSTA Bretagne",
        courseOrRole="Engenharia Mecânica UFTM (dual degree / exchange)",
        location="Uberaba, Minas Gerais, Brazil / Brest, France",
        linkedinUrl="https://www.linkedin.com/in/evandro-moroni",
        email="",
        status="student",
        notes="Dual degree vehicle architecture",
    ),
    dict(
        fullName="Ana Letícia Santos Abrão",
        title="Doutoranda em Ciência e Tecnologia Ambiental pela UFTM",
        courseOrRole="Doutorado Ciência e Tecnologia Ambiental (2025–Present) | Eng. Ambiental UFTM (2014–2016)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/ana-leticia-santos-abrao",
        email="",
        status="student",
        notes="Current PhD student; undergrad alumni",
    ),
    dict(
        fullName="Ana Laura Carvalho da Silva",
        title="Bacharel em Biomedicina UFTM | Mestranda",
        courseOrRole="Mestrado Health Professions (2024–2026); Biomedicina (2019–2024)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/analauracarvalho99",
        email="",
        status="student",
        notes="Mestrado current; undergrad alumni",
    ),
    dict(
        fullName="Amália Almeida",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Licenciatura em Física (2020–2025)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/amaliacsa",
        email="",
        status="alumni",
        notes="Education window through 2025",
    ),
    dict(
        fullName="Aramis Machado Brandão",
        title="Aluno na UFTM | Green Belt Lean Six Sigma",
        courseOrRole="Engenharia de Produção (2020–2025)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/aramisbrand%C3%A3o",
        email="",
        status="alumni",
        notes="Education window through 2025; PROJEP/TEDxUFTM",
    ),
    dict(
        fullName="Wanessa Ulisses",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Fisioterapia (2020–2025)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/wanessa-ulisses-399256238",
        email="",
        status="alumni",
        notes="Education window through 2025",
    ),
    dict(
        fullName="Fernanda Cristina Rodrigues",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Psicologia (2019–2025)",
        location="São Carlos, São Paulo, Brazil",
        linkedinUrl="https://www.linkedin.com/in/fernanda-crod",
        email="",
        status="alumni",
        notes="Education window through 2025",
    ),
    dict(
        fullName="Ana Julia Fernandes",
        title="Aluno na UFTM - Universidade Federal do Triângulo Mineiro",
        courseOrRole="Psicologia (2016–2021)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/ana-julia-fernandes-55a76820a",
        email="",
        status="alumni",
        notes="",
    ),
    dict(
        fullName="Alanys Alves Cardoso",
        title="Acadêmica de Psicologia pela UFTM",
        courseOrRole="Psicologia (2018–2022)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/alanys-alves-cardoso-555773241",
        email="",
        status="alumni",
        notes="Headline may lag; education ended 2022",
    ),
    dict(
        fullName="Victor Augusto Oliveira e Silva",
        title="Graduando em Terapia Ocupacional na UFTM",
        courseOrRole="Terapia Ocupacional (2020–2024)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/victor-augusto-to",
        email="",
        status="alumni",
        notes="Education window through 2024",
    ),
    dict(
        fullName="Júlia Silveira de Freitas",
        title="Bacharel em Enfermagem pela UFTM",
        courseOrRole="Enfermagem (2019–2024)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/j%C3%BAlia-silveira-de-freitas",
        email="",
        status="alumni",
        notes="",
    ),
    dict(
        fullName="Luana Costa",
        title="Graduação em Ciências Biológicas - UFTM",
        courseOrRole="Ciências Biológicas (conclusão 2025)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/luana-costa-7426b71b0",
        email="",
        status="alumni",
        notes="Recém-formada",
    ),
    dict(
        fullName="Patricia Félix",
        title="Graduada em Serviço Social - UFTM",
        courseOrRole="Serviço Social (2016–2021)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/patricia-f%C3%A9lix-416438240",
        email="",
        status="alumni",
        notes="",
    ),
    dict(
        fullName="Laura Moreira",
        title="Engenheira Química",
        courseOrRole="Engenharia Química (2019–2024)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/laura-moreira-660095265",
        email="",
        status="alumni",
        notes="",
    ),
    dict(
        fullName="Vanessa Rosa",
        title="Psicóloga pela UFTM | Psicologia Organizacional e do Trabalho",
        courseOrRole="Psicologia (2019–2026; recém-formada)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/vanessa-rosa-948231251",
        email="",
        status="alumni",
        notes="Self-describes as recém-formada",
    ),
    dict(
        fullName="Guilherme Nomiyama",
        title="Engenharia de Produção - UFTM",
        courseOrRole="Engenharia de Produção (2020–2025)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/guilherme-nomiyama-g032024",
        email="",
        status="alumni",
        notes="Education window through 2025",
    ),
    dict(
        fullName="Rafael Caio",
        title="Engenheiro Químico | Analista de Orçamentos e Especialista em Compras",
        courseOrRole="Engenharia Química (2016–Present / profissional)",
        location="Uberaba, Minas Gerais, Brazil",
        linkedinUrl="https://www.linkedin.com/in/rafael-caio-8b5b23260",
        email="",
        status="alumni",
        notes="Title indicates graduated engineer",
    ),
]


def write_csv(path: Path, rows: list[dict], delimiter: str = ",") -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=COLS,
            delimiter=delimiter,
            extrasaction="ignore",
            lineterminator="\n",
        )
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in COLS})


def write_html(path: Path, rows: list[dict], title: str, note: str) -> None:
    body_rows = []
    for r in rows:
        tds = "".join(f"<td>{html.escape(str(r.get(c, '')))}</td>" for c in COLS)
        body_rows.append(f"<tr>{tds}</tr>")
    doc = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{html.escape(title)}</title>
<style>
body{{font-family:ui-sans-serif,system-ui,sans-serif;margin:1rem;background:#f7f7f5;color:#1a1a1a}}
h1{{font-size:1.25rem}}
.note{{color:#555;font-size:.9rem;margin-bottom:1rem}}
table{{border-collapse:collapse;width:100%;background:#fff}}
th,td{{border:1px solid #ddd;padding:.45rem .55rem;font-size:.85rem;vertical-align:top}}
th{{background:#eee;text-align:left}}
</style>
</head>
<body>
<h1>{html.escape(title)}</h1>
<p class="note">{html.escape(note)}</p>
<table>
<thead><tr>{''.join(f'<th>{c}</th>' for c in COLS)}</tr></thead>
<tbody>
{''.join(body_rows)}
</tbody>
</table>
</body>
</html>
"""
    path.write_text(doc, encoding="utf-8")


def write_xlsx(path: Path, rows: list[dict], sheet_name: str) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31]
    ws.append(COLS)
    for r in rows:
        ws.append([r.get(c, "") for c in COLS])
    wb.save(path)


def main() -> None:
    people: list[dict] = []
    seen: set[str] = set()
    for p in PEOPLE_RAW:
        key = (p["linkedinUrl"].rstrip("/").lower() if p["linkedinUrl"] else p["fullName"].lower())
        if key in seen:
            continue
        seen.add(key)
        fn = first_name(p["fullName"])
        gg = gender_guess(p["fullName"])
        people.append({**p, "firstName": fn, "genderGuess": gg})

    people.sort(key=lambda x: x["fullName"].casefold())

    men = [p for p in people if p["genderGuess"] == "male"]
    students = [p for p in people if p["status"] == "student"]
    students_men = [p for p in students if p["genderGuess"] == "male"]
    alumni = [p for p in people if p["status"] == "alumni"]
    women = [p for p in people if p["genderGuess"] == "female"]
    gunk = [p for p in people if p["genderGuess"] == "unknown"]

    (OUT / "uftm-people.json").write_text(
        json.dumps(people, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_csv(OUT / "uftm-people.csv", people, ",")
    write_csv(OUT / "uftm-people-ios.csv", people, ";")
    write_csv(OUT / "uftm-estudantes-ios.csv", students, ";")
    write_csv(OUT / "uftm-students-ios.csv", students, ";")
    write_csv(OUT / "uftm-estudantes-homens-ios.csv", students_men, ";")

    (OUT / "uftm-men.json").write_text(
        json.dumps(men, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_csv(OUT / "uftm-men.csv", men, ",")
    write_csv(OUT / "uftm-men-ios.csv", men, ";")

    write_html(
        OUT / "uftm-people.html",
        people,
        "UFTM — LinkedIn people (public)",
        "Dados públicos indexados (LinkedIn/web). Sem login Apify (quota mensal excedida). "
        "Heurística de gênero por primeiro nome BR. Query original \"Estuda na uftn\" "
        "interpretada como UFTM (Uberaba); UFTN não existe (próximo: UFNT/TO).",
    )
    write_html(
        OUT / "uftm-men.html",
        men,
        "UFTM — LinkedIn men (heuristic)",
        "Filtro masculino por heurística de primeiro nome brasileiro. "
        "Manter lista completa como fonte da verdade.",
    )

    write_xlsx(OUT / "uftm-people.xlsx", people, "uftm-people")
    write_xlsx(OUT / "uftm-men.xlsx", men, "uftm-men")

    now = datetime.now(timezone.utc).isoformat()
    school_pages = [
        {
            "name": "UFTM - Universidade Federal do Triângulo Mineiro",
            "linkedinUrl": "https://www.linkedin.com/school/uftmsocial",
            "aliases": [
                "UFTM",
                "Universidade Federal do Triângulo Mineiro",
                "Federal University of Triângulo Mineiro",
            ],
            "notes": "Primary school page referenced across student education sections.",
        },
        {
            "name": "Universidade Federal do Triângulo Mineiro",
            "linkedinUrl": "https://www.linkedin.com/school/universidade-federal-do-tri-ngulo-mineiro",
            "aliases": ["Universidade Federal do Triângulo Mineiro"],
            "notes": "Alternate school slug seen on some profiles (e.g. Nyna Marques).",
        },
        {
            "name": "UFTM (company)",
            "linkedinUrl": "https://www.linkedin.com/company/uftmsocial",
            "aliases": ["linkedin.com/company/6853500", "uftmsocial"],
            "notes": "Institutional company/page used by some education entries.",
        },
    ]

    counts = {
        "people": len(people),
        "students": len(students),
        "alumni": len(alumni),
        "unknownStatus": sum(1 for p in people if p["status"] not in ("student", "alumni")),
        "men": len(men),
        "women": len(women),
        "genderUnknown": len(gunk),
        "withLinkedInUrl": sum(1 for p in people if p.get("linkedinUrl")),
        "withEmail": sum(1 for p in people if p.get("email")),
        "studentsMen": len(students_men),
    }

    runs = {
        "generatedAt": now,
        "queryTypoNote": (
            "User wrote 'uftn'. No Brazilian HEI named UFTN found. Closest names: "
            "UFNT (Universidade Federal do Norte do Tocantins) and UFT "
            "(Universidade Federal do Tocantins). Given prior Uberaba/Uniube scrapes, "
            "target is UFTM."
        ),
        "schoolPages": school_pages,
        "apify": {
            "attempted": [
                {
                    "actor": "harvestapi/linkedin-profile-search",
                    "purpose": "People search schools=UFTM / Universidade Federal do Triângulo Mineiro",
                    "status": "FAILED",
                    "error": "Monthly usage hard limit exceeded",
                },
                {
                    "actor": "apify/web-fetch",
                    "purpose": "Fetch school page uftmsocial",
                    "status": "FAILED",
                    "error": "Monthly usage hard limit exceeded",
                },
            ],
            "spendUsd": 0,
        },
        "fallbackSources": [
            "Public LinkedIn-indexed search snippets (WebSearch)",
            "Public LinkedIn profile cards when available",
        ],
        "counts": counts,
    }

    summary = {
        "query": "Estuda na uftn → UFTM — LinkedIn people (students + alumni)",
        "school": "Universidade Federal do Triângulo Mineiro (UFTM), Uberaba/MG, Brazil",
        "schoolPages": school_pages,
        "method": (
            "Apify HarvestAPI blocked by monthly hard limit; "
            "fallback to public LinkedIn-indexed web discovery."
        ),
        "counts": counts,
        "genderMethod": "brazilian-first-name-heuristics",
        "primaryExport": "data/uftm-estudantes-ios.csv",
        "files": [
            "uftm-people.json",
            "uftm-people.csv",
            "uftm-people-ios.csv",
            "uftm-estudantes-ios.csv",
            "uftm-estudantes-homens-ios.csv",
            "uftm-students-ios.csv",
            "uftm-men.json",
            "uftm-men.csv",
            "uftm-men-ios.csv",
            "uftm-men.xlsx",
            "uftm-men.html",
            "uftm-people.xlsx",
            "uftm-people.html",
            "uftm-runs.json",
            "uftm-summary.json",
            "runs.json",
            "summary.json",
        ],
        "notes": [
            "Legitimate public data only; no LinkedIn login/cookies.",
            "Prefer current students; alumni included and labeled.",
            "Emails not available in public snippets (none found).",
            "Gender filter is heuristic only — keep full list as source of truth.",
            "No HEI named UFTN; used UFTM (Uberaba). UFNT is a different university in Tocantins.",
            f"Generated {now}",
        ],
    }

    (OUT / "uftm-runs.json").write_text(
        json.dumps(runs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "uftm-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "runs.json").write_text(
        json.dumps(runs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(json.dumps(counts, indent=2))
    print("unknown_gender", [p["fullName"] for p in gunk])


if __name__ == "__main__":
    main()
