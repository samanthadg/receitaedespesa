package br.com.lancamento.service;

import br.com.lancamento.domain.Lancamento;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LancamentoEmailService {
  private static final Locale LOCALE_PT_BR = Locale.of("pt", "BR");
  private static final DateTimeFormatter DATA_PT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final boolean enabled;
  private final String fallbackTo;
  private final String from;
  private final String apiKey;

  public LancamentoEmailService(
      @Value("${app.mail.enabled:false}") boolean enabled,
      @Value("${app.mail.to:}") String fallbackTo,
      @Value("${app.mail.from:onboarding@resend.dev}") String from,
      @Value("${app.resend.api-key:}") String apiKey) {
    this.enabled = enabled;
    this.fallbackTo = fallbackTo == null ? "" : fallbackTo.trim();
    this.from = from == null ? "" : from.trim();
    this.apiKey = apiKey == null ? "" : apiKey.trim();
  }

  public void onCreate(Lancamento l, String to) {
    send("Lançamento criado", l, to);
  }

  public void onUpdate(Lancamento l, String to) {
    send("Lançamento atualizado", l, to);
  }

  private void send(String prefix, Lancamento l, String toOverride) {
    if (!enabled) return;
    String to = normalizeEmail(toOverride);
    if (to == null) to = normalizeEmail(fallbackTo);
    if (to == null) return;
    if (apiKey.isBlank()) return;
    if (l == null) return;

    NumberFormat moeda = NumberFormat.getCurrencyInstance(LOCALE_PT_BR);
    String id = l.getId() == null ? "—" : String.valueOf(l.getId());
    String descricao = l.getDescricao() == null ? "" : l.getDescricao();
    String data =
        l.getDataLancamento() == null ? "—" : DATA_PT.format(l.getDataLancamento());
    String valor = l.getValor() == null ? "—" : moeda.format(l.getValor());
    String tipo = l.getTipoLancamento() == null ? "—" : l.getTipoLancamento().name();
    String situacao = l.getSituacao() == null ? "—" : l.getSituacao().name();

    String assunto = prefix + " #" + id + " - " + tipo;

    String html =
        "<p>Um lançamento foi <strong>"
            + (prefix.contains("criado") ? "criado" : "atualizado")
            + "</strong>.</p>"
            + "<ul>"
            + "<li><strong>ID:</strong> " + escapeHtml(id) + "</li>"
            + "<li><strong>Descrição:</strong> " + escapeHtml(descricao) + "</li>"
            + "<li><strong>Data:</strong> " + escapeHtml(data) + "</li>"
            + "<li><strong>Valor:</strong> " + escapeHtml(valor) + "</li>"
            + "<li><strong>Tipo:</strong> " + escapeHtml(tipo) + "</li>"
            + "<li><strong>Situação:</strong> " + escapeHtml(situacao) + "</li>"
            + "</ul>";

    Resend resend = new Resend(apiKey);
    CreateEmailOptions req =
        CreateEmailOptions.builder()
            .from(from)
            .to(to)
            .subject(assunto)
            .html(html)
            .build();

    // best-effort: se falhar, não derruba o fluxo do controller
    try {
      resend.emails().send(req);
    } catch (ResendException ignored) {
      // intentionally ignored
    }
  }

  private static String escapeHtml(String s) {
    if (s == null) return "";
    return s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }

  private static String normalizeEmail(String email) {
    if (email == null) return null;
    String v = email.trim();
    return v.isBlank() ? null : v;
  }
}

