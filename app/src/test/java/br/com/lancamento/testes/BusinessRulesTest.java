package br.com.lancamento.testes;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("business")
class BusinessRulesTest {
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  @Test
  void lancamento_situacaoInvalida_lancaExcecao() {
    assertThrows(IllegalArgumentException.class, () -> Situacao.valueOf("SITUACAO_INVALIDA"));
  }

  @Test
  void lancamento_valorZero_naoDeveSerValido() {
    Lancamento l = baseLancamento();
    l.setValor(BigDecimal.ZERO);
    var violations = validator.validate(l);
    assertFalse(violations.isEmpty());
  }

  @Test
  void lancamento_tipoNulo_naoDeveSerValido() {
    Lancamento l = baseLancamento();
    l.setTipoLancamento(null);
    var violations = validator.validate(l);
    assertFalse(violations.isEmpty());
  }

  private static Lancamento baseLancamento() {
    Lancamento l = new Lancamento();
    l.setDescricao("Teste");
    l.setDataLancamento(LocalDate.now());
    l.setValor(new BigDecimal("10.00"));
    l.setTipoLancamento(TipoLancamento.RECEITA);
    l.setSituacao(Situacao.EFETIVADO);
    return l;
  }
}
