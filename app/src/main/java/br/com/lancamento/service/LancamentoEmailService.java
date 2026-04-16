package br.com.lancamento.service;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import jakarta.mail.internet.MimeMessage;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class LancamentoEmailService {
  private static final Logger log = LoggerFactory.getLogger(LancamentoEmailService.class);
  private static final Locale LOCALE_PT_BR = Locale.of("pt", "BR");
  private static final DateTimeFormatter DATA_PT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final JavaMailSender mailSender;
  private final boolean enabled;
  private final String fallbackTo;
  private final String from;
  private final String smtpUser;
  private final String smtpPass;
  private final String publicBaseUrl;

  public LancamentoEmailService(
      JavaMailSender mailSender,
      @Value("${app.mail.enabled:false}") boolean enabled,
      @Value("${app.mail.to:}") String fallbackTo,
      @Value("${app.mail.from:}") String from,
      @Value("${spring.mail.username:}") String smtpUser,
      @Value("${spring.mail.password:}") String smtpPass,
      @Value("${app.public-base-url:}") String publicBaseUrl) {
    this.mailSender = mailSender;
    this.enabled = enabled;
    this.fallbackTo = fallbackTo == null ? "" : fallbackTo.trim();
    this.from = from == null ? "" : from.trim();
    this.smtpUser = smtpUser == null ? "" : smtpUser.trim();
    this.smtpPass = smtpPass == null ? "" : smtpPass.replaceAll("\\s+", "").trim();
    this.publicBaseUrl = normalizeBaseUrl(publicBaseUrl);
  }

  public void onCreate(Lancamento l, String to) {
    if (!enabled) return;
    String recipient = resolveTo(to);
    if (recipient == null) return;
    if (l == null) return;
    if (!smtpConfigured()) return;

    NumberFormat moeda = NumberFormat.getCurrencyInstance(LOCALE_PT_BR);
    String id = l.getId() == null ? "—" : String.valueOf(l.getId());
    String tipo = l.getTipoLancamento() == null ? "—" : l.getTipoLancamento().name();

    String assunto = "Lançamento criado #" + id + " - " + tipo;
    String body =
        title("Novo lançamento registrado")
            + paragraph("Um lançamento foi <strong>criado</strong> no sistema.")
            + detailsTable(l, moeda)
            + optionalCta();

    sendHtml(assunto, wrapEmailHtml(body), recipient);
  }

  public void onUpdate(Lancamento before, Lancamento after, String to) {
    if (!enabled) return;
    String recipient = resolveTo(to);
    if (recipient == null) return;
    if (after == null) return;
    if (!smtpConfigured()) return;

    NumberFormat moeda = NumberFormat.getCurrencyInstance(LOCALE_PT_BR);
    Snapshot oldSnap = Snapshot.from(before, moeda);
    Snapshot newSnap = Snapshot.from(after, moeda);

    String id = after.getId() == null ? "—" : String.valueOf(after.getId());
    String tipo = after.getTipoLancamento() == null ? "—" : after.getTipoLancamento().name();
    String assunto = "Lançamento atualizado #" + id + " - " + tipo;

    List<ChangeRow> changes = diff(oldSnap, newSnap);
    String changesHtml =
        changes.isEmpty()
            ? mutedBox("Nenhuma alteração detectada (os valores enviados eram iguais aos já salvos).")
            : changesTable(changes);

    String body =
        title("Lançamento atualizado")
            + paragraph("Um lançamento foi <strong>atualizado</strong>. Abaixo estão as mudanças detectadas.")
            + changesHtml
            + subtitle("Estado atual")
            + detailsTable(after, moeda)
            + optionalCta();

    sendHtml(assunto, wrapEmailHtml(body), recipient);
  }

  private String resolveTo(String toOverride) {
    String to = normalizeEmail(toOverride);
    if (to == null) to = normalizeEmail(fallbackTo);
    return to;
  }

  private boolean smtpConfigured() {
    if (smtpUser.isBlank() || smtpPass.isBlank()) {
      log.warn("SMTP não configurado: defina SMTP_USER e SMTP_PASS (via env / spring.mail.username/password).");
      return false;
    }
    return true;
  }

  private String resolveFromAddress() {
    if (!from.isBlank()) return from;
    if (!smtpUser.isBlank()) return smtpUser;
    return "";
  }

  private void sendHtml(String subject, String html, String to) {
    String fromAddr = resolveFromAddress();
    if (fromAddr.isBlank()) {
      log.warn("Remetente não configurado: defina APP_MAIL_FROM ou SMTP_USER.");
      return;
    }

    // best-effort: se falhar, não derruba o fluxo do controller
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(fromAddr);
      helper.setTo(to);
      helper.setSubject(subject);
      helper.setText(html, true);
      mailSender.send(message);
    } catch (Exception e) {
      log.warn("Falha ao enviar e-mail via SMTP (to={}, from={}, subject={}): {}", to, fromAddr, subject, e.getMessage());
    }
  }

  private String optionalCta() {
    if (publicBaseUrl.isBlank()) return "";
    String href = publicBaseUrl + "/lancamentos";
    return ""
        + "<div style=\"margin:18px 0 0;text-align:center;\">"
        + "<a href=\""
        + escapeHtml(href)
        + "\" style=\"display:inline-block;background:#1b67b1;color:#ffffff;text-decoration:none;"
        + "padding:10px 14px;border-radius:10px;font-weight:700;font-size:14px;\">"
        + "Abrir lançamentos"
        + "</a>"
        + "</div>";
  }

  private static String wrapEmailHtml(String innerBody) {
    return ""
        + "<!doctype html>"
        + "<html lang=\"pt-br\">"
        + "<head>"
        + "<meta charset=\"utf-8\" />"
        + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />"
        + "<meta http-equiv=\"x-ua-compatible\" content=\"ie=edge\" />"
        + "<title>Lançamento</title>"
        + "</head>"
        + "<body style=\"margin:0;background:#f3f6fb;padding:22px 12px;font-family:Segoe UI, Tahoma, Arial, sans-serif;\">"
        + "<div style=\"max-width:720px;margin:0 auto;\">"
        + "<div style=\"background:#ffffff;border:1px solid #dde6f0;border-radius:14px;"
        + "box-shadow:0 14px 40px rgba(16,24,40,0.10);overflow:hidden;\">"
        + "<div style=\"padding:16px 18px;background:linear-gradient(135deg,#1b67b1,#155a9b);\">"
        + "<div style=\"color:#eaf2ff;font-size:12px;letter-spacing:0.2px;font-weight:700;\">LANÇAMENTOS</div>"
        + "<div style=\"color:#ffffff;font-size:18px;font-weight:800;line-height:1.25;margin-top:6px;\">"
        + "Notificação do sistema"
        + "</div>"
        + "</div>"
        + "<div style=\"padding:18px 18px 20px;color:#1f2a37;font-size:15px;line-height:1.55;\">"
        + innerBody
        + "<div style=\"margin-top:18px;padding-top:14px;border-top:1px solid #edf1f5;color:#5b6977;font-size:12px;\">"
        + "Este é um e-mail automático. Se você não reconhece esta ação, ignore esta mensagem."
        + "</div>"
        + "</div>"
        + "</div>"
        + "</body>"
        + "</html>";
  }

  private static String title(String text) {
    return "<div style=\"font-size:18px;font-weight:800;margin:0 0 10px;\">" + escapeHtml(text) + "</div>";
  }

  private static String subtitle(String text) {
    return "<div style=\"font-size:14px;font-weight:800;margin:18px 0 10px;color:#2f4860;\">"
        + escapeHtml(text)
        + "</div>";
  }

  private static String paragraph(String html) {
    return "<div style=\"margin:0 0 16px;color:#334e68;\">" + html + "</div>";
  }

  private static String mutedBox(String text) {
    return ""
        + "<div style=\"margin:0 0 16px;padding:12px 12px;border:1px solid #dde6f0;background:#fbfdff;"
        + "border-radius:12px;color:#52606d;font-size:14px;\">"
        + escapeHtml(text)
        + "</div>";
  }

  private static String detailsTable(Lancamento l, NumberFormat moeda) {
    Snapshot s = Snapshot.from(l, moeda);
    return ""
        + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" "
        + "style=\"border-collapse:separate;border-spacing:0;border:1px solid #edf1f5;border-radius:12px;overflow:hidden;\">"
        + row("ID", escapeHtml(s.id))
        + row("Descrição", escapeHtml(s.descricao))
        + row("Data", escapeHtml(s.data))
        + row("Valor", escapeHtml(s.valor))
        + row("Tipo", escapeHtml(s.tipo))
        + row("Situação", escapeHtml(s.situacao))
        + "</table>";
  }

  private static String changesTable(List<ChangeRow> changes) {
    StringBuilder sb = new StringBuilder();
    sb.append(
        "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" "
            + "style=\"border-collapse:separate;border-spacing:0;border:1px solid #edf1f5;border-radius:12px;"
            + "overflow:hidden;margin:0 0 16px;\">");
    sb.append(
        "<tr>"
            + "<td style=\"padding:10px 12px;background:#f7faff;border-bottom:1px solid #edf1f5;"
            + "font-size:12px;font-weight:800;color:#2f4860;width:28%;\">Campo</td>"
            + "<td style=\"padding:10px 12px;background:#f7faff;border-bottom:1px solid #edf1f5;"
            + "font-size:12px;font-weight:800;color:#2f4860;width:36%;\">Antes</td>"
            + "<td style=\"padding:10px 12px;background:#f7faff;border-bottom:1px solid #edf1f5;"
            + "font-size:12px;font-weight:800;color:#2f4860;width:36%;\">Depois</td>"
            + "</tr>");
    for (ChangeRow c : changes) {
      sb.append(
          "<tr>"
              + "<td style=\"padding:10px 12px;border-bottom:1px solid #edf1f5;font-weight:700;color:#334e68;\">"
              + escapeHtml(c.field)
              + "</td>"
              + "<td style=\"padding:10px 12px;border-bottom:1px solid #edf1f5;color:#52606d;\">"
              + escapeHtml(c.before)
              + "</td>"
              + "<td style=\"padding:10px 12px;border-bottom:1px solid #edf1f5;color:#1f2a37;font-weight:700;\">"
              + escapeHtml(c.after)
              + "</td>"
              + "</tr>");
    }
    sb.append("</table>");
    return sb.toString();
  }

  private static String row(String k, String v) {
    return ""
        + "<tr>"
        + "<td style=\"padding:10px 12px;width:34%;background:#fbfdff;border-bottom:1px solid #edf1f5;"
        + "color:#52606d;font-size:13px;font-weight:700;\">"
        + escapeHtml(k)
        + "</td>"
        + "<td style=\"padding:10px 12px;border-bottom:1px solid #edf1f5;color:#1f2a37;font-size:14px;\">"
        + v
        + "</td>"
        + "</tr>";
  }

  private static List<ChangeRow> diff(Snapshot oldSnap, Snapshot newSnap) {
    List<ChangeRow> out = new ArrayList<>();
    if (!Objects.equals(oldSnap.descricao, newSnap.descricao)) {
      out.add(new ChangeRow("Descrição", oldSnap.descricao, newSnap.descricao));
    }
    if (!Objects.equals(oldSnap.data, newSnap.data)) {
      out.add(new ChangeRow("Data", oldSnap.data, newSnap.data));
    }
    if (!Objects.equals(oldSnap.valor, newSnap.valor)) {
      out.add(new ChangeRow("Valor", oldSnap.valor, newSnap.valor));
    }
    if (!Objects.equals(oldSnap.tipo, newSnap.tipo)) {
      out.add(new ChangeRow("Tipo", oldSnap.tipo, newSnap.tipo));
    }
    if (!Objects.equals(oldSnap.situacao, newSnap.situacao)) {
      out.add(new ChangeRow("Situação", oldSnap.situacao, newSnap.situacao));
    }
    return out;
  }

  private record Snapshot(String id, String descricao, String data, String valor, String tipo, String situacao) {
    static Snapshot from(Lancamento l, NumberFormat moeda) {
      if (l == null) {
        return new Snapshot("—", "—", "—", "—", "—", "—");
      }
      String id = l.getId() == null ? "—" : String.valueOf(l.getId());
      String descricao = l.getDescricao() == null ? "" : l.getDescricao();
      String data = l.getDataLancamento() == null ? "—" : DATA_PT.format(l.getDataLancamento());
      String valor = l.getValor() == null ? "—" : moeda.format(l.getValor());
      TipoLancamento tipo = l.getTipoLancamento();
      Situacao sit = l.getSituacao();
      return new Snapshot(
          id,
          descricao.isBlank() ? "—" : descricao,
          data,
          valor,
          tipo == null ? "—" : tipo.name(),
          sit == null ? "—" : sit.name());
    }
  }

  private record ChangeRow(String field, String before, String after) {}

  private static String normalizeBaseUrl(String url) {
    if (url == null) return "";
    String v = url.trim();
    if (v.isBlank()) return "";
    while (v.endsWith("/")) v = v.substring(0, v.length() - 1);
    return v;
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

