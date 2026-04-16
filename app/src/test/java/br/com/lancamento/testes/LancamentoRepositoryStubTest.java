package br.com.lancamento.testes;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import br.com.lancamento.repo.LancamentoRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

@Tag("mock")
class LancamentoRepositoryStubTest {

  /** Mock de save atribui ID ao objeto; verifica que a entidade retornada não fica sem id. */
  @Test
  void lancamentoRepo_salvar_retornaEntidade() {
    LancamentoRepository stub = Mockito.mock(LancamentoRepository.class);
    when(stub.save(any(Lancamento.class)))
        .thenAnswer(
            inv -> {
              Lancamento l = inv.getArgument(0, Lancamento.class);
              l.setId(123L);
              return l;
            });

    Lancamento saved = stub.save(baseLancamentoSemId());

    assertNotNull(saved.getId());
  }

  private static Lancamento baseLancamentoSemId() {
    Lancamento l = new Lancamento();
    l.setDescricao("Teste");
    l.setDataLancamento(LocalDate.now());
    l.setValor(new BigDecimal("10.00"));
    l.setTipoLancamento(TipoLancamento.RECEITA);
    l.setSituacao(Situacao.EFETIVADO);
    return l;
  }
}
