package br.com.lancamento.testes;

import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Lê os relatórios Surefire (TEST-*.xml) e imprime uma linha por teste:
 *
 * <p>Teste N, &lt;rótulo&gt;, testa &lt;objetivo&gt;, ok|erro;
 *
 * <p>Argumentos: {@code [diretorioRelatorios] [|classesFiltro]} — se omitido, usa {@code target/surefire-reports} e todos
 * os 20 testes. {@code classesFiltro} é lista de FQCN separada por vírgula (após um {@code |}).
 */
public final class TestSummaryPrinter {

  private record Entry(int num, String className, String methodName, String label, String goal) {}

  private static final Entry[] MANIFEST = {
    new Entry(1, "br.com.lancamento.testes.EnumDominioTest", "tipoLancamento_receita_existeNoEnum", "tipoLancamento_receita_existeNoEnum", "se RECEITA existe no enum TipoLancamento"),
    new Entry(2, "br.com.lancamento.testes.EnumDominioTest", "tipoLancamento_valorInvalido_lancaExcecao", "tipoLancamento_valorInvalido_lancaExcecao", "se valor inválido em TipoLancamento lança IllegalArgumentException"),
    new Entry(3, "br.com.lancamento.testes.EnumDominioTest", "situacao_efetivado_existeNoEnum", "situacao_efetivado_existeNoEnum", "se EFETIVADO, PENDENTE e CANCELADO existem no enum Situacao"),
    new Entry(4, "br.com.lancamento.testes.ValidationTest", "lancamento_descricaoVazia_naoDeveSerValido", "lancamento_descricaoVazia_naoDeveSerValido", "se lançamento com descrição vazia falha na validação"),
    new Entry(5, "br.com.lancamento.testes.ValidationTest", "lancamento_valorNegativo_naoDeveSerValido", "lancamento_valorNegativo_naoDeveSerValido", "se lançamento com valor negativo é rejeitado"),
    new Entry(6, "br.com.lancamento.testes.ValidationTest", "lancamento_dataNula_naoDeveSerValido", "lancamento_dataNula_naoDeveSerValido", "se lançamento sem data_lancamento não é aceito"),
    new Entry(7, "br.com.lancamento.testes.ValidationTest", "usuario_loginVazio_naoDeveSerValido", "usuario_loginVazio_naoDeveSerValido", "se usuário com login vazio falha na validação"),
    new Entry(8, "br.com.lancamento.testes.ValidationTest", "usuario_emailAcimaDe160Chars_naoDeveSerValido", "usuario_emailAcimaDe160Chars_naoDeveSerValido", "se e-mail com mais de 160 caracteres é rejeitado"),
    new Entry(9, "br.com.lancamento.testes.BusinessRulesTest", "lancamento_situacaoInvalida_lancaExcecao", "lancamento_situacaoInvalida_lancaExcecao", "se situação inválida lança exceção"),
    new Entry(10, "br.com.lancamento.testes.BusinessRulesTest", "lancamento_valorZero_naoDeveSerValido", "lancamento_valorZero_naoDeveSerValido", "se lançamento com valor zero é rejeitado"),
    new Entry(11, "br.com.lancamento.testes.BusinessRulesTest", "lancamento_tipoNulo_naoDeveSerValido", "lancamento_tipoNulo_naoDeveSerValido", "se lançamento sem tipo_lancamento falha"),
    new Entry(12, "br.com.lancamento.testes.LancamentoEmailServiceTest", "emailService_criarLancamento_enviaEmail", "emailService_criarLancamento_enviaEmail", "se ao salvar lançamento o envio de e-mail é chamado uma vez"),
    new Entry(13, "br.com.lancamento.testes.LancamentoEmailServiceTest", "emailService_mailDesabilitado_naoEnviaEmail", "emailService_mailDesabilitado_naoEnviaEmail", "se com e-mail desabilitado não há chamada de envio"),
    new Entry(14, "br.com.lancamento.testes.LancamentoRepositoryStubTest", "lancamentoRepo_salvar_retornaEntidade", "lancamentoRepo_salvar_retornaEntidade", "se stub do repositório retorna entidade com ID após save"),
    new Entry(15, "br.com.lancamento.testes.LancamentoRepositoryJpaTest", "repositorio_salvarEBuscar_lancamentoEncontrado", "repositorio_salvarEBuscar_lancamentoEncontrado", "se salvar e buscar por ID persiste os dados"),
    new Entry(16, "br.com.lancamento.testes.LancamentoRepositoryJpaTest", "repositorio_listarPorSituacao_retornaApenasEfetivados", "repositorio_listarPorSituacao_retornaApenasEfetivados", "se filtro por EFETIVADO retorna só efetivados"),
    new Entry(17, "br.com.lancamento.testes.LancamentoRepositoryJpaTest", "repositorio_contarLancamentos_retornaTotalCorreto", "repositorio_contarLancamentos_retornaTotalCorreto", "se count() retorna o total inserido"),
    new Entry(18, "br.com.lancamento.testes.AuthControllerTest", "login_credenciaisValidas_redirecionaParaHome", "login_credenciaisValidas_redirecionaParaHome", "se POST /login com credenciais válidas redireciona para /lancamentos"),
    new Entry(19, "br.com.lancamento.testes.AuthControllerTest", "login_credenciaisInvalidas_retornaMensagemDeErro", "login_credenciaisInvalidas_retornaMensagemDeErro", "se POST /login com senha errada retorna página de login com erro"),
    new Entry(20, "br.com.lancamento.testes.LancamentoPdfExporterTest", "pdfExporter_gerarPdf_naoRetornaNulo", "pdfExporter_gerarPdf_naoRetornaNulo", "se exportação PDF não retorna nulo"),
  };

  private TestSummaryPrinter() {}

  public static void main(String[] args) throws Exception {
    String combined = args.length > 0 ? args[0] : "target/surefire-reports";
    String reportsDirStr;
    String classFilterRaw = "";
    int pipe = combined.indexOf('|');
    if (pipe >= 0) {
      reportsDirStr = combined.substring(0, pipe).trim();
      classFilterRaw = combined.substring(pipe + 1).trim();
    } else {
      reportsDirStr = combined.trim();
    }

    Path reportsDir = Paths.get(reportsDirStr).toAbsolutePath().normalize();
    Set<String> classFilter = new HashSet<>();
    if (!classFilterRaw.isBlank()) {
      for (String p : classFilterRaw.split(",")) {
        String c = p.trim();
        if (!c.isEmpty()) {
          classFilter.add(c);
        }
      }
    }

    Map<String, String> results = parseReports(reportsDir);

    for (Entry e : MANIFEST) {
      if (!classFilter.isEmpty() && !classFilter.contains(e.className)) {
        continue;
      }
      String key = e.className + "\0" + e.methodName;
      String status = results.getOrDefault(key, "erro");
      System.out.printf(
          Locale.ROOT, "Teste %d, %s, testa %s, %s;%n", e.num, e.label, e.goal, status);
    }
  }

  private static String localName(Node n) {
    String ln = n.getLocalName();
    return ln != null ? ln : n.getNodeName();
  }

  private static Map<String, String> parseReports(Path reportsDir) throws Exception {
    Map<String, String> out = new HashMap<>();
    if (!Files.isDirectory(reportsDir)) {
      return out;
    }

    try (DirectoryStream<Path> stream = Files.newDirectoryStream(reportsDir, "TEST-*.xml")) {
      for (Path path : stream) {
        Document doc = parseXml(path);
        if (doc == null) {
          continue;
        }
        collectTestCases(doc.getDocumentElement(), out);
      }
    }
    return out;
  }

  private static Document parseXml(Path path) throws Exception {
    var factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);
    factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
    factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
    return factory.newDocumentBuilder().parse(path.toFile());
  }

  private static void collectTestCases(Node node, Map<String, String> out) {
    if (node instanceof Element el && "testcase".equals(localName(el))) {
      String cname = el.getAttribute("classname");
      String mname = el.getAttribute("name");
      if (!cname.isEmpty() && !mname.isEmpty()) {
        String status = "ok";
        NodeList children = el.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
          Node ch = children.item(i);
          if (!(ch instanceof Element child)) {
            continue;
          }
          String tag = localName(child);
          if ("failure".equals(tag) || "error".equals(tag)) {
            status = "erro";
            break;
          }
          if ("skipped".equals(tag)) {
            status = "erro";
          }
        }
        out.put(cname + "\0" + mname, status);
      }
    }
    NodeList list = node.getChildNodes();
    for (int i = 0; i < list.getLength(); i++) {
      collectTestCases(list.item(i), out);
    }
  }
}
