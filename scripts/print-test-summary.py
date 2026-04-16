#!/usr/bin/env python3
"""
Lê relatórios Surefire (TEST-*.xml) e imprime uma linha por teste:
  Teste N, <rótulo>, testa <objetivo>, ok|erro;

Uso:
  python3 scripts/print-test-summary.py [diretorio_relatorios] [--classes CLASSE1,CLASSE2,...]
Se --classes for omitido, imprime os 20 testes na ordem oficial.
"""

from __future__ import annotations

import glob
import os
import sys
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Set, Tuple

# (número, classe, método, rótulo curto, objetivo)
MANIFEST: List[Tuple[int, str, str, str, str]] = [
    (
        1,
        "br.com.lancamento.testes.EnumDominioTest",
        "tipoLancamento_receita_existeNoEnum",
        "tipoLancamento_receita_existeNoEnum",
        "se RECEITA existe no enum TipoLancamento",
    ),
    (
        2,
        "br.com.lancamento.testes.EnumDominioTest",
        "tipoLancamento_valorInvalido_lancaExcecao",
        "tipoLancamento_valorInvalido_lancaExcecao",
        "se valor inválido em TipoLancamento lança IllegalArgumentException",
    ),
    (
        3,
        "br.com.lancamento.testes.EnumDominioTest",
        "situacao_efetivado_existeNoEnum",
        "situacao_efetivado_existeNoEnum",
        "se EFETIVADO, PENDENTE e CANCELADO existem no enum Situacao",
    ),
    (
        4,
        "br.com.lancamento.testes.ValidationTest",
        "lancamento_descricaoVazia_naoDeveSerValido",
        "lancamento_descricaoVazia_naoDeveSerValido",
        "se lançamento com descrição vazia falha na validação",
    ),
    (
        5,
        "br.com.lancamento.testes.ValidationTest",
        "lancamento_valorNegativo_naoDeveSerValido",
        "lancamento_valorNegativo_naoDeveSerValido",
        "se lançamento com valor negativo é rejeitado",
    ),
    (
        6,
        "br.com.lancamento.testes.ValidationTest",
        "lancamento_dataNula_naoDeveSerValido",
        "lancamento_dataNula_naoDeveSerValido",
        "se lançamento sem data_lancamento não é aceito",
    ),
    (
        7,
        "br.com.lancamento.testes.ValidationTest",
        "usuario_loginVazio_naoDeveSerValido",
        "usuario_loginVazio_naoDeveSerValido",
        "se usuário com login vazio falha na validação",
    ),
    (
        8,
        "br.com.lancamento.testes.ValidationTest",
        "usuario_emailAcimaDe160Chars_naoDeveSerValido",
        "usuario_emailAcimaDe160Chars_naoDeveSerValido",
        "se e-mail com mais de 160 caracteres é rejeitado",
    ),
    (
        9,
        "br.com.lancamento.testes.BusinessRulesTest",
        "lancamento_situacaoInvalida_lancaExcecao",
        "lancamento_situacaoInvalida_lancaExcecao",
        "se situação inválida lança exceção",
    ),
    (
        10,
        "br.com.lancamento.testes.BusinessRulesTest",
        "lancamento_valorZero_naoDeveSerValido",
        "lancamento_valorZero_naoDeveSerValido",
        "se lançamento com valor zero é rejeitado",
    ),
    (
        11,
        "br.com.lancamento.testes.BusinessRulesTest",
        "lancamento_tipoNulo_naoDeveSerValido",
        "lancamento_tipoNulo_naoDeveSerValido",
        "se lançamento sem tipo_lancamento falha",
    ),
    (
        12,
        "br.com.lancamento.testes.LancamentoEmailServiceTest",
        "emailService_criarLancamento_enviaEmail",
        "emailService_criarLancamento_enviaEmail",
        "se ao salvar lançamento o envio de e-mail é chamado uma vez",
    ),
    (
        13,
        "br.com.lancamento.testes.LancamentoEmailServiceTest",
        "emailService_mailDesabilitado_naoEnviaEmail",
        "emailService_mailDesabilitado_naoEnviaEmail",
        "se com e-mail desabilitado não há chamada de envio",
    ),
    (
        14,
        "br.com.lancamento.testes.LancamentoRepositoryStubTest",
        "lancamentoRepo_salvar_retornaEntidade",
        "lancamentoRepo_salvar_retornaEntidade",
        "se stub do repositório retorna entidade com ID após save",
    ),
    (
        15,
        "br.com.lancamento.testes.LancamentoRepositoryJpaTest",
        "repositorio_salvarEBuscar_lancamentoEncontrado",
        "repositorio_salvarEBuscar_lancamentoEncontrado",
        "se salvar e buscar por ID persiste os dados",
    ),
    (
        16,
        "br.com.lancamento.testes.LancamentoRepositoryJpaTest",
        "repositorio_listarPorSituacao_retornaApenasEfetivados",
        "repositorio_listarPorSituacao_retornaApenasEfetivados",
        "se filtro por EFETIVADO retorna só efetivados",
    ),
    (
        17,
        "br.com.lancamento.testes.LancamentoRepositoryJpaTest",
        "repositorio_contarLancamentos_retornaTotalCorreto",
        "repositorio_contarLancamentos_retornaTotalCorreto",
        "se count() retorna o total inserido",
    ),
    (
        18,
        "br.com.lancamento.testes.AuthControllerTest",
        "login_credenciaisValidas_redirecionaParaHome",
        "login_credenciaisValidas_redirecionaParaHome",
        "se POST /login com credenciais válidas redireciona para /lancamentos",
    ),
    (
        19,
        "br.com.lancamento.testes.AuthControllerTest",
        "login_credenciaisInvalidas_retornaMensagemDeErro",
        "login_credenciaisInvalidas_retornaMensagemDeErro",
        "se POST /login com senha errada retorna página de login com erro",
    ),
    (
        20,
        "br.com.lancamento.testes.LancamentoPdfExporterTest",
        "pdfExporter_gerarPdf_naoRetornaNulo",
        "pdfExporter_gerarPdf_naoRetornaNulo",
        "se exportação PDF não retorna nulo",
    ),
]


def _local_tag(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def parse_reports(reports_dir: str) -> Dict[Tuple[str, str], str]:
    """Mapeia (classname, methodname) -> 'ok' | 'erro'."""
    out: Dict[Tuple[str, str], str] = {}
    pattern = os.path.join(reports_dir, "TEST-*.xml")
    for path in glob.glob(pattern):
        try:
            tree = ET.parse(path)
        except ET.ParseError:
            continue
        root = tree.getroot()
        for el in root.iter():
            if _local_tag(el.tag) != "testcase":
                continue
            cname = el.attrib.get("classname")
            mname = el.attrib.get("name")
            if not cname or not mname:
                continue
            status = "ok"
            for child in el:
                lt = _local_tag(child.tag)
                if lt in ("failure", "error"):
                    status = "erro"
                    break
                if lt == "skipped":
                    status = "erro"
            out[(cname, mname)] = status
    return out


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    argv = sys.argv[1:]
    default_reports = os.path.join(os.path.dirname(__file__), "..", "app", "target", "surefire-reports")
    reports_dir = os.path.abspath(default_reports)
    class_filter: Optional[Set[str]] = None

    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--classes" and i + 1 < len(argv):
            class_filter = {c.strip() for c in argv[i + 1].split(",") if c.strip()}
            i += 2
            continue
        if a.startswith("--"):
            i += 1
            continue
        reports_dir = os.path.abspath(a)
        i += 1

    results = parse_reports(reports_dir) if os.path.isdir(reports_dir) else {}

    lines: List[str] = []
    for num, cls, method, label, goal in MANIFEST:
        if class_filter is not None and cls not in class_filter:
            continue
        key = (cls, method)
        status = results.get(key)
        if status is None:
            status = "erro"
        lines.append(f"Teste {num}, {label}, testa {goal}, {status};")

    for line in lines:
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
