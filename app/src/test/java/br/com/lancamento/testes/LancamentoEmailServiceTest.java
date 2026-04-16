package br.com.lancamento.testes;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import br.com.lancamento.service.LancamentoEmailService;
import jakarta.mail.internet.MimeMessage;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mail.javamail.JavaMailSender;

@Tag("mock")
class LancamentoEmailServiceTest {

  @Test
  void emailService_criarLancamento_enviaEmail() {
    JavaMailSender mailSender = Mockito.mock(JavaMailSender.class);
    MimeMessage mime = Mockito.mock(MimeMessage.class);
    when(mailSender.createMimeMessage()).thenReturn(mime);

    LancamentoEmailService service =
        new LancamentoEmailService(
            mailSender,
            true, // enabled
            "fallback@example.com",
            "from@example.com",
            "smtpUser",
            "smtpPass",
            "");

    service.onCreate(baseLancamento(), "to@example.com");

    verify(mailSender, times(1)).send(any(MimeMessage.class));
  }

  @Test
  void emailService_mailDesabilitado_naoEnviaEmail() {
    JavaMailSender mailSender = Mockito.mock(JavaMailSender.class);
    MimeMessage mime = Mockito.mock(MimeMessage.class);
    when(mailSender.createMimeMessage()).thenReturn(mime);

    LancamentoEmailService service =
        new LancamentoEmailService(
            mailSender,
            false, // enabled
            "fallback@example.com",
            "from@example.com",
            "smtpUser",
            "smtpPass",
            "");

    service.onCreate(baseLancamento(), "to@example.com");

    verify(mailSender, never()).send(any(MimeMessage.class));
  }

  private static Lancamento baseLancamento() {
    Lancamento l = new Lancamento();
    l.setId(1L);
    l.setDescricao("Teste");
    l.setDataLancamento(LocalDate.now());
    l.setValor(new BigDecimal("10.00"));
    l.setTipoLancamento(TipoLancamento.RECEITA);
    l.setSituacao(Situacao.EFETIVADO);
    return l;
  }
}
