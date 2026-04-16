package br.com.lancamento.testes;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import br.com.lancamento.web.LancamentoPdfExporter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("pdf")
class LancamentoPdfExporterTest {

  @Test
  void pdfExporter_gerarPdf_naoRetornaNulo() {
    byte[] pdf =
        LancamentoPdfExporter.export(
            List.of(baseLancamento()), null, null, "");

    assertNotNull(pdf);
    assertTrue(pdf.length > 0);
  }

  private static Lancamento baseLancamento() {
    Lancamento l = new Lancamento();
    l.setId(1L);
    l.setDescricao("Teste PDF");
    l.setDataLancamento(LocalDate.now());
    l.setValor(new BigDecimal("10.00"));
    l.setTipoLancamento(TipoLancamento.RECEITA);
    l.setSituacao(Situacao.EFETIVADO);
    return l;
  }
}
