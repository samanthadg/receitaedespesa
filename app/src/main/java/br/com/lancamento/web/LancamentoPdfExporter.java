package br.com.lancamento.web;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.TipoLancamento;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.Rectangle;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

final class LancamentoPdfExporter {
  private static final DateTimeFormatter DATA_PT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final Locale LOCALE_PT_BR = Locale.of("pt", "BR");

  private LancamentoPdfExporter() {}

  static byte[] export(
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

      addHeader(table, headerFont, "ID");
      addHeader(table, headerFont, "Descrição");
      addHeader(table, headerFont, "Data");
      addHeader(table, headerFont, "Valor");
      addHeader(table, headerFont, "Tipo");
      addHeader(table, headerFont, "Situação");

      NumberFormat moeda = NumberFormat.getCurrencyInstance(LOCALE_PT_BR);
      BigDecimal totalReceitas = BigDecimal.ZERO;
      BigDecimal totalDespesas = BigDecimal.ZERO;

      for (Lancamento l : lancamentos) {
        table.addCell(cell(l.getId() == null ? "" : String.valueOf(l.getId()), cellFont, Element.ALIGN_LEFT));
        table.addCell(cell(nullToEmpty(l.getDescricao()), cellFont, Element.ALIGN_LEFT));
        table.addCell(
            cell(l.getDataLancamento() == null ? "" : DATA_PT.format(l.getDataLancamento()), cellFont, Element.ALIGN_LEFT));
        BigDecimal valor = l.getValor();
        TipoLancamento tipo = l.getTipoLancamento();
        table.addCell(cell(formatMoney(moeda, valor), cellFont, Element.ALIGN_RIGHT));
        table.addCell(cell(tipo == null ? "" : tipo.name(), cellFont, Element.ALIGN_LEFT));
        table.addCell(cell(l.getSituacao() == null ? "" : l.getSituacao().name(), cellFont, Element.ALIGN_LEFT));
        if (valor != null) {
          if (tipo == TipoLancamento.RECEITA) {
            totalReceitas = totalReceitas.add(valor.abs());
          } else if (tipo == TipoLancamento.DESPESA) {
            totalDespesas = totalDespesas.add(valor.abs());
          }
        }
      }

      document.add(table);
      document.add(new Paragraph(" "));
      BigDecimal saldo = totalReceitas.subtract(totalDespesas);
      document.add(new Paragraph("Total de receitas: " + moeda.format(totalReceitas), metaFont));
      document.add(new Paragraph("Total de despesas: " + moeda.format(totalDespesas), metaFont));
      document.add(new Paragraph("Saldo (receitas - despesas): " + moeda.format(saldo), totalFont));

      document.close();
      return out.toByteArray();
    } catch (DocumentException e) {
      throw new IllegalStateException("Falha ao gerar PDF.", e);
    } catch (Exception e) {
      throw new IllegalStateException("Falha ao gerar PDF.", e);
    }
  }

  private static void addHeader(PdfPTable table, Font font, String text) {
    PdfPCell cell = new PdfPCell(new Phrase(text, font));
    cell.setHorizontalAlignment(Element.ALIGN_LEFT);
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
    String de = dataDe == null ? "—" : DATA_PT.format(dataDe);
    String ate = dataAte == null ? "—" : DATA_PT.format(dataAte);
    String sit = (situacao == null || situacao.isBlank()) ? "Todas" : situacao;
    return "Filtros: data de " + de + " até " + ate + " | situação: " + sit + " | gerado em " + DATA_PT.format(LocalDate.now());
  }

  private static String formatMoney(NumberFormat moeda, BigDecimal valor) {
    return valor == null ? "" : moeda.format(valor);
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }
}

