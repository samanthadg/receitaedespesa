package br.com.lancamento.testes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import br.com.lancamento.repo.LancamentoRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest(
    properties = {"spring.sql.init.mode=never", "spring.jpa.hibernate.ddl-auto=create-drop"})
@Tag("db")
class LancamentoRepositoryJpaTest {

  @Autowired private LancamentoRepository repository;

  @Test
  void repositorio_salvarEBuscar_lancamentoEncontrado() {
    Lancamento saved = repository.save(novoLancamento("Persistido", Situacao.EFETIVADO));

    assertNotNull(saved.getId());

    Lancamento found = repository.findById(saved.getId()).orElse(null);
    assertNotNull(found);
    assertEquals("Persistido", found.getDescricao());
  }

  @Test
  void repositorio_listarPorSituacao_retornaApenasEfetivados() {
    repository.save(novoLancamento("A", Situacao.EFETIVADO));
    repository.save(novoLancamento("B", Situacao.PENDENTE));
    repository.save(novoLancamento("C", Situacao.CANCELADO));

    List<Lancamento> efetivados = repository.findBySituacao(Situacao.EFETIVADO);

    assertTrue(efetivados.stream().allMatch(l -> l.getSituacao() == Situacao.EFETIVADO));
    assertEquals(1, efetivados.size());
  }

  @Test
  void repositorio_contarLancamentos_retornaTotalCorreto() {
    repository.deleteAll();
    repository.save(novoLancamento("1", Situacao.EFETIVADO));
    repository.save(novoLancamento("2", Situacao.EFETIVADO));
    repository.save(novoLancamento("3", Situacao.PENDENTE));
    repository.save(novoLancamento("4", Situacao.CANCELADO));

    assertEquals(4, repository.count());
  }

  private static Lancamento novoLancamento(String descricao, Situacao situacao) {
    Lancamento l = new Lancamento();
    l.setDescricao(descricao);
    l.setDataLancamento(LocalDate.now());
    l.setValor(new BigDecimal("10.00"));
    l.setTipoLancamento(TipoLancamento.RECEITA);
    l.setSituacao(situacao);
    return l;
  }
}
