package br.com.lancamento.testes;

import static org.junit.jupiter.api.Assertions.assertFalse;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import br.com.lancamento.domain.Usuario;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("validation")
class ValidationTest {
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  /** Descrição em branco em Lancamento deve gerar violações Bean Validation. */
  @Test
  void lancamento_descricaoVazia_naoDeveSerValido() {
    Lancamento l = baseLancamento();
    l.setDescricao("");
    var violations = validator.validate(l);
    assertFalse(violations.isEmpty());
  }

  /** Valor negativo em Lancamento não deve passar na validação. */
  @Test
  void lancamento_valorNegativo_naoDeveSerValido() {
    Lancamento l = baseLancamento();
    l.setValor(new BigDecimal("-1.00"));
    var violations = validator.validate(l);
    assertFalse(violations.isEmpty());
  }

  /** dataLancamento null deve ser rejeitada pelas constraints do Lancamento. */
  @Test
  void lancamento_dataNula_naoDeveSerValido() {
    Lancamento l = baseLancamento();
    l.setDataLancamento(null);
    var violations = validator.validate(l);
    assertFalse(violations.isEmpty());
  }

  /** Login vazio em Usuario deve violar validação (campo obrigatório/tamanho). */
  @Test
  void usuario_loginVazio_naoDeveSerValido() {
    Usuario u = baseUsuario();
    u.setLogin("");
    var violations = validator.validate(u);
    assertFalse(violations.isEmpty());
  }

  /** E-mail acima do @Size configurado na entidade Usuario deve falhar na validação. */
  @Test
  void usuario_emailAcimaDe160Chars_naoDeveSerValido() {
    Usuario u = baseUsuario();
    String longEmail = "a".repeat(161) + "@x.com";
    u.setEmail(longEmail);
    var violations = validator.validate(u);
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

  private static Usuario baseUsuario() {
    Usuario u = new Usuario();
    u.setNome("Usuário");
    u.setLogin("login");
    u.setSenha("senha");
    u.setSituacao("ATIVO");
    u.setEmail("user@example.com");
    return u;
  }
}
