package br.com.lancamento.web;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.TipoLancamento;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Chunk;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.Rectangle;
import br.com.lancamento.domain.Situacao;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;

public final class LancamentoPdfExporter {
  private static final DateTimeFormatter DATA_PT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final Locale LOCALE_PT_BR = Locale.of("pt", "BR");

  private LancamentoPdfExporter() {}

  public static byte[] export(
      List<Lancamento> lancamentos, LocalDate dataDe, LocalDate dataAte, String situacao) {
    try (var out = new ByteArrayOutputStream()) {
      Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
      PdfWriter.getInstance(document, out);
      document.open();

      Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
      Font metaFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
      Font headerFont = new Font(Font.HELVETICA, 11, Font.BOLD);
      Font cellFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
      Font totalFont = new Font(Font.HELVETICA, 12, Font.BOLD);

      document.add(new Paragraph("Relatório de Lançamentos", titleFont));
      document.add(new Paragraph(filtrosText(dataDe, dataAte, situacao), metaFont));
      document.add(new Paragraph(" "));

      PdfPTable table = new PdfPTable(new float[] {1.1f, 4.6f, 1.9f, 1.8f, 1.8f, 1.8f});
      table.setWidthPercentage(100f);
      table.setHeaderRows(1);
      table.getDefaultCell().setBorder(Rectangle.BOX);

      addHeader(table, headerFont, "ID", Element.ALIGN_CENTER);
      addHeader(table, headerFont, "Descrição", Element.ALIGN_LEFT);
      addHeader(table, headerFont, "Data", Element.ALIGN_CENTER);
      addHeader(table, headerFont, "Valor", Element.ALIGN_CENTER);
      addHeader(table, headerFont, "Tipo", Element.ALIGN_CENTER);
      addHeader(table, headerFont, "Situação", Element.ALIGN_CENTER);

      NumberFormat moeda = NumberFormat.getCurrencyInstance(LOCALE_PT_BR);

      for (Lancamento l : lancamentos) {
        table.addCell(cell(l.getId() == null ? "" : String.valueOf(l.getId()), cellFont, Element.ALIGN_CENTER));
        table.addCell(cell(nullToEmpty(l.getDescricao()), cellFont, Element.ALIGN_LEFT));
        table.addCell(
            cell(l.getDataLancamento() == null ? "" : DATA_PT.format(l.getDataLancamento()), cellFont, Element.ALIGN_CENTER));
        BigDecimal valor = l.getValor();
        TipoLancamento tipo = l.getTipoLancamento();
        table.addCell(cell(formatMoney(moeda, valor), cellFont, Element.ALIGN_CENTER));
        table.addCell(cell(tipo == null ? "" : tipo.name(), cellFont, Element.ALIGN_CENTER));
        table.addCell(cell(l.getSituacao() == null ? "" : l.getSituacao().name(), cellFont, Element.ALIGN_CENTER));
      }

      document.add(table);
      document.add(new Paragraph(" "));
      addTotaisPorSituacao(document, lancamentos, situacao, moeda, metaFont, totalFont);

      document.close();
      return out.toByteArray();
    } catch (DocumentException e) {
      throw new IllegalStateException("Falha ao gerar PDF.", e);
    } catch (Exception e) {
      throw new IllegalStateException("Falha ao gerar PDF.", e);
    }
  }

  private static void addHeader(PdfPTable table, Font font, String text, int align) {
    PdfPCell cell = new PdfPCell(new Phrase(text, font));
    cell.setHorizontalAlignment(align);
    cell.setPadding(6f);
    cell.setBackgroundColor(new java.awt.Color(247, 250, 255));
    cell.setBorderColor(new java.awt.Color(223, 231, 239));
    table.addCell(cell);
  }

  private static PdfPCell cell(String text, Font font, int align) {
    PdfPCell cell = new PdfPCell(new Phrase(text, font));
    cell.setHorizontalAlignment(align);
    cell.setPadding(5f);
    cell.setBorderColor(new java.awt.Color(237, 241, 245));
    return cell;
  }

  private static String filtrosText(LocalDate dataDe, LocalDate dataAte, String situacao) {
    String geradoEm = DATA_PT.format(LocalDate.now());
    boolean temDe = dataDe != null;
    boolean temAte = dataAte != null;
    boolean temSit = situacao != null && !situacao.isBlank();

    if (!temDe && !temAte && !temSit) {
      return "Gerado em " + geradoEm;
    }

    StringBuilder sb = new StringBuilder();
    sb.append("Filtros: ");

    boolean primeiro = true;
    if (temDe && !temAte) {
      sb.append("Data(s) a partir de ").append(DATA_PT.format(dataDe));
      primeiro = false;
    } else if (!temDe && temAte) {
      sb.append("Data(s) até ").append(DATA_PT.format(dataAte));
      primeiro = false;
    } else if (temDe && temAte) {
      sb.append("Data(s) entre ").append(DATA_PT.format(dataDe)).append(" e ").append(DATA_PT.format(dataAte));
      primeiro = false;
    }

    if (temSit) {
      if (!primeiro) sb.append(" | ");
      sb.append("Situação: ").append(situacao.trim());
      primeiro = false;
    }

    if (!primeiro) sb.append(" | ");
    sb.append("Gerado em ").append(geradoEm);
    return sb.toString();
  }

  private static void addTotaisPorSituacao(
      Document document,
      List<Lancamento> lancamentos,
      String situacaoFiltro,
      NumberFormat moeda,
      Font metaFont,
      Font totalFont)
      throws DocumentException {
    Situacao filtro = parseSituacaoLancamentoOrNull(situacaoFiltro);

    EnumMap<Situacao, BigDecimal> receitas = new EnumMap<>(Situacao.class);
    EnumMap<Situacao, BigDecimal> despesas = new EnumMap<>(Situacao.class);
    for (Situacao s : situacoesRelatorio()) {
      receitas.put(s, BigDecimal.ZERO);
      despesas.put(s, BigDecimal.ZERO);
    }

    for (Lancamento l : lancamentos) {
      Situacao sit = l.getSituacao();
      if (sit == null) continue;
      if (!receitas.containsKey(sit)) continue;

      BigDecimal valor = l.getValor();
      if (valor == null) continue;
      TipoLancamento tipo = l.getTipoLancamento();
      if (tipo == TipoLancamento.RECEITA) {
        receitas.put(sit, receitas.get(sit).add(valor.abs()));
      } else if (tipo == TipoLancamento.DESPESA) {
        despesas.put(sit, despesas.get(sit).add(valor.abs()));
      }
    }

    document.add(new Paragraph("Totais por situação", totalFont));

    if (filtro == null) {
      PdfPTable cols = new PdfPTable(new float[] {1f, 1f, 1f});
      cols.setWidthPercentage(100f);
      cols.setSpacingBefore(6f);
      cols.setSpacingAfter(10f);

      PdfPCell ef = situacaoTotalsTextCell(Situacao.EFETIVADO, receitas, despesas, moeda, metaFont, totalFont);
      PdfPCell pe = situacaoTotalsTextCell(Situacao.PENDENTE, receitas, despesas, moeda, metaFont, totalFont);
      PdfPCell ca = situacaoTotalsTextCell(Situacao.CANCELADO, receitas, despesas, moeda, metaFont, totalFont);
      cols.addCell(ef);
      cols.addCell(pe);
      cols.addCell(ca);
      document.add(cols);

      BigDecimal comboRec =
          receitas.getOrDefault(Situacao.EFETIVADO, BigDecimal.ZERO)
              .add(receitas.getOrDefault(Situacao.PENDENTE, BigDecimal.ZERO));
      BigDecimal comboDes =
          despesas.getOrDefault(Situacao.EFETIVADO, BigDecimal.ZERO)
              .add(despesas.getOrDefault(Situacao.PENDENTE, BigDecimal.ZERO));
      BigDecimal comboSaldo = comboRec.subtract(comboDes);

      document.add(centeredParagraph("Total (EFETIVADO + PENDENTE)", totalFont));
      document.add(centeredParagraph("Total de receitas: " + moeda.format(comboRec), metaFont));
      document.add(centeredParagraph("Total de despesas: " + moeda.format(comboDes), metaFont));
      document.add(centeredParagraph("Saldo: " + moeda.format(comboSaldo), metaFont));
      return;
    }

    // Situação filtrada: manter o layout simples (uma coluna), pois só existe uma situação selecionada.
    PdfPTable single = new PdfPTable(1);
    single.setWidthPercentage(100f);
    single.setSpacingBefore(6f);
    single.setSpacingAfter(10f);
    single.addCell(situacaoTotalsTextCell(filtro, receitas, despesas, moeda, metaFont, totalFont));
    document.add(single);
  }

  private static PdfPCell situacaoTotalsTextCell(
      Situacao sit,
      EnumMap<Situacao, BigDecimal> receitas,
      EnumMap<Situacao, BigDecimal> despesas,
      NumberFormat moeda,
      Font metaFont,
      Font titleFont) {
    BigDecimal rec = receitas.getOrDefault(sit, BigDecimal.ZERO);
    BigDecimal des = despesas.getOrDefault(sit, BigDecimal.ZERO);
    BigDecimal saldo = rec.subtract(des);

    Paragraph p = new Paragraph();
    p.setAlignment(Element.ALIGN_CENTER);
    p.add(new Chunk("Situação: " + sit.name() + "\n", titleFont));
    p.add(new Chunk("\n", metaFont));
    p.add(new Chunk("Total de receitas:\n", metaFont));
    p.add(new Chunk(moeda.format(rec) + "\n\n", metaFont));
    p.add(new Chunk("Total de despesas:\n", metaFont));
    p.add(new Chunk(moeda.format(des) + "\n\n", metaFont));
    p.add(new Chunk("Saldo:\n", metaFont));
    p.add(new Chunk(moeda.format(saldo), metaFont));

    PdfPCell cell = new PdfPCell(p);
    cell.setBorder(Rectangle.NO_BORDER);
    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
    cell.setVerticalAlignment(Element.ALIGN_TOP);
    cell.setPadding(8f);
    return cell;
  }

  private static Paragraph centeredParagraph(String text, Font font) {
    Paragraph p = new Paragraph(text, font);
    p.setAlignment(Element.ALIGN_CENTER);
    return p;
  }

  private static List<Situacao> situacoesRelatorio() {
    return List.of(Situacao.EFETIVADO, Situacao.PENDENTE, Situacao.CANCELADO);
  }

  private static Situacao parseSituacaoLancamentoOrNull(String situacao) {
    if (situacao == null) return null;
    String v = situacao.trim();
    if (v.isBlank()) return null;
    try {
      Situacao s = Situacao.valueOf(v);
      return situacoesRelatorio().contains(s) ? s : null;
    } catch (Exception e) {
      return null;
    }
  }

  private static String formatMoney(NumberFormat moeda, BigDecimal valor) {
    return valor == null ? "" : moeda.format(valor);
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }
}

