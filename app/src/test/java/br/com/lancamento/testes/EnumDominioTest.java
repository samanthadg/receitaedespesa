package br.com.lancamento.testes;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("enum")
class EnumDominioTest {

  /** Confere que a constante RECEITA está definida em TipoLancamento. */
  @Test
  void tipoLancamento_receita_existeNoEnum() {
    assertNotNull(TipoLancamento.valueOf("RECEITA"));
  }

  /** Nome inválido no enum TipoLancamento deve lançar IllegalArgumentException. */
  @Test
  void tipoLancamento_valorInvalido_lancaExcecao() {
    assertThrows(IllegalArgumentException.class, () -> TipoLancamento.valueOf("INVALIDO"));
  }

  /** Confere que os três estados usados no domínio existem no enum Situacao. */
  @Test
  void situacao_efetivado_existeNoEnum() {
    assertDoesNotThrow(() -> Situacao.valueOf("EFETIVADO"));
    assertDoesNotThrow(() -> Situacao.valueOf("PENDENTE"));
    assertDoesNotThrow(() -> Situacao.valueOf("CANCELADO"));
  }
}
