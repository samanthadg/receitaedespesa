package br.com.lancamento.domain;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("enum")
class EnumDominioTest {

  @Test
  void tipoLancamento_receita_existeNoEnum() {
    assertNotNull(TipoLancamento.valueOf("RECEITA"));
  }

  @Test
  void tipoLancamento_valorInvalido_lancaExcecao() {
    assertThrows(IllegalArgumentException.class, () -> TipoLancamento.valueOf("INVALIDO"));
  }

  @Test
  void situacao_efetivado_existeNoEnum() {
    assertDoesNotThrow(() -> Situacao.valueOf("EFETIVADO"));
    assertDoesNotThrow(() -> Situacao.valueOf("PENDENTE"));
    assertDoesNotThrow(() -> Situacao.valueOf("CANCELADO"));
  }
}

