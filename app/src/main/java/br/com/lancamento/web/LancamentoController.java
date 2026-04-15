package br.com.lancamento.web;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import br.com.lancamento.domain.TipoLancamento;
import br.com.lancamento.domain.Usuario;
import br.com.lancamento.repo.LancamentoRepository;
import br.com.lancamento.repo.UsuarioRepository;
import br.com.lancamento.service.LancamentoEmailService;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/lancamentos")
public class LancamentoController {
  private static final Set<String> CAMPOS_ORDENACAO =
      Set.of("id", "descricao", "dataLancamento", "valor", "tipoLancamento", "situacao");

  private final LancamentoRepository lancamentoRepository;
  private final UsuarioRepository usuarioRepository;
  private final LancamentoEmailService lancamentoEmailService;

  public LancamentoController(
      LancamentoRepository lancamentoRepository,
      UsuarioRepository usuarioRepository,
      LancamentoEmailService lancamentoEmailService) {
    this.lancamentoRepository = lancamentoRepository;
    this.usuarioRepository = usuarioRepository;
    this.lancamentoEmailService = lancamentoEmailService;
  }

  @GetMapping
  public String listar(
      @RequestParam(defaultValue = "dataLancamento") String campo,
      @RequestParam(defaultValue = "desc") String direcao,
      @RequestParam(required = false) String dataDe,
      @RequestParam(required = false) String dataAte,
      @RequestParam(required = false) String situacao,
      Model model) {
    String campoOrdenacao = CAMPOS_ORDENACAO.contains(campo) ? campo : "dataLancamento";
    Sort.Direction direction = "asc".equalsIgnoreCase(direcao) ? Sort.Direction.ASC : Sort.Direction.DESC;
    Sort sort = Sort.by(direction, campoOrdenacao).and(Sort.by("id"));

    LocalDate dtDe = parseDateOrNull(dataDe);
    LocalDate dtAte = parseDateOrNull(dataAte);
    Situacao sit = parseSituacaoOrNull(situacao);

    Specification<Lancamento> spec = Specification.where(null);
    if (dtDe != null) {
      spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("dataLancamento"), dtDe));
    }
    if (dtAte != null) {
      spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("dataLancamento"), dtAte));
    }
    if (sit != null) {
      spec = spec.and((root, q, cb) -> cb.equal(root.get("situacao"), sit));
    }

    var lista = lancamentoRepository.findAll(spec, sort);
    model.addAttribute("lancamentos", lista);
    model.addAttribute("campo", campoOrdenacao);
    model.addAttribute("direcao", direction.name().toLowerCase());
    model.addAttribute("dataDe", dtDe == null ? "" : dtDe.toString());
    model.addAttribute("dataAte", dtAte == null ? "" : dtAte.toString());
    model.addAttribute("situacao", sit == null ? "" : sit.name());
    model.addAttribute("situacoes", situacoesLancamento());
    return "lancamentos/lista";
  }

  @GetMapping("/export/pdf")
  public ResponseEntity<byte[]> exportPdf(
      @RequestParam(defaultValue = "dataLancamento") String campo,
      @RequestParam(defaultValue = "desc") String direcao,
      @RequestParam(required = false) String dataDe,
      @RequestParam(required = false) String dataAte,
      @RequestParam(required = false) String situacao) {
    String campoOrdenacao = CAMPOS_ORDENACAO.contains(campo) ? campo : "dataLancamento";
    Sort.Direction direction = "asc".equalsIgnoreCase(direcao) ? Sort.Direction.ASC : Sort.Direction.DESC;
    Sort sort = Sort.by(direction, campoOrdenacao).and(Sort.by("id"));

    LocalDate dtDe = parseDateOrNull(dataDe);
    LocalDate dtAte = parseDateOrNull(dataAte);
    Situacao sit = parseSituacaoOrNull(situacao);

    Specification<Lancamento> spec = Specification.where(null);
    if (dtDe != null) {
      spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("dataLancamento"), dtDe));
    }
    if (dtAte != null) {
      spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("dataLancamento"), dtAte));
    }
    if (sit != null) {
      spec = spec.and((root, q, cb) -> cb.equal(root.get("situacao"), sit));
    }

    var lista = lancamentoRepository.findAll(spec, sort);
    byte[] pdf = LancamentoPdfExporter.export(lista, dtDe, dtAte, sit == null ? "" : sit.name());

    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"lancamentos.pdf\"")
        .body(pdf);
  }

  @PostMapping
  public String adicionar(
      @RequestParam String descricao,
      @RequestParam String dataLancamento,
      @RequestParam String valor,
      @RequestParam String tipoLancamento,
      @RequestParam String situacao,
      HttpSession session,
      RedirectAttributes redirectAttributes) {
    try {
      Lancamento lancamento = new Lancamento();
      lancamento.setDescricao(descricao.trim());
      lancamento.setDataLancamento(LocalDate.parse(dataLancamento));
      lancamento.setValor(new BigDecimal(valor));
      lancamento.setTipoLancamento(TipoLancamento.valueOf(tipoLancamento));
      lancamento.setSituacao(Situacao.valueOf(situacao));
      Lancamento saved = lancamentoRepository.save(lancamento);
      lancamentoEmailService.onCreate(saved, resolveToEmail(session));
      redirectAttributes.addFlashAttribute("msg", "Lançamento adicionado com sucesso.");
    } catch (Exception e) {
      redirectAttributes.addFlashAttribute("erro", "Não foi possível adicionar o lançamento.");
    }
    return "redirect:/lancamentos";
  }

  @PostMapping("/{id}/excluir")
  public String excluir(@PathVariable Long id, RedirectAttributes redirectAttributes) {
    if (lancamentoRepository.existsById(id)) {
      lancamentoRepository.deleteById(id);
      redirectAttributes.addFlashAttribute("msg", "Lançamento excluído.");
    } else {
      redirectAttributes.addFlashAttribute("erro", "Lançamento não encontrado.");
    }
    return "redirect:/lancamentos";
  }

  @GetMapping("/{id}/editar")
  public String editar(@PathVariable Long id, Model model, RedirectAttributes redirectAttributes) {
    var lancamento = lancamentoRepository.findById(id).orElse(null);
    if (lancamento == null) {
      redirectAttributes.addFlashAttribute("erro", "Lançamento não encontrado.");
      return "redirect:/lancamentos";
    }
    model.addAttribute("lancamento", lancamento);
    return "lancamentos/editar";
  }

  @PostMapping("/{id}")
  public String atualizar(
      @PathVariable Long id,
      @RequestParam String descricao,
      @RequestParam String dataLancamento,
      @RequestParam String valor,
      @RequestParam String tipoLancamento,
      @RequestParam String situacao,
      HttpSession session,
      RedirectAttributes redirectAttributes) {
    var lancamento = lancamentoRepository.findById(id).orElse(null);
    if (lancamento == null) {
      redirectAttributes.addFlashAttribute("erro", "Lançamento não encontrado.");
      return "redirect:/lancamentos";
    }

    try {
      lancamento.setDescricao(descricao.trim());
      lancamento.setDataLancamento(LocalDate.parse(dataLancamento));
      lancamento.setValor(new BigDecimal(valor));
      lancamento.setTipoLancamento(TipoLancamento.valueOf(tipoLancamento));
      lancamento.setSituacao(Situacao.valueOf(situacao));
      Lancamento saved = lancamentoRepository.save(lancamento);
      lancamentoEmailService.onUpdate(saved, resolveToEmail(session));
      redirectAttributes.addFlashAttribute("msg", "Lançamento atualizado.");
      return "redirect:/lancamentos";
    } catch (Exception e) {
      redirectAttributes.addFlashAttribute("erro", "Não foi possível atualizar o lançamento.");
      return "redirect:/lancamentos/" + id + "/editar";
    }
  }

  private static LocalDate parseDateOrNull(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return LocalDate.parse(value.trim());
    } catch (Exception e) {
      return null;
    }
  }

  private static Situacao parseSituacaoOrNull(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      Situacao sit = Situacao.valueOf(value.trim());
      return isSituacaoLancamento(sit) ? sit : null;
    } catch (Exception e) {
      return null;
    }
  }

  private static List<Situacao> situacoesLancamento() {
    return List.of(Situacao.EFETIVADO, Situacao.PENDENTE, Situacao.CANCELADO);
  }

  private static boolean isSituacaoLancamento(Situacao s) {
    return s == Situacao.EFETIVADO || s == Situacao.PENDENTE || s == Situacao.CANCELADO;
  }

  private String resolveToEmail(HttpSession session) {
    if (session == null) return null;
    Object loginObj = session.getAttribute(AuthController.SESSION_USER);
    if (loginObj == null) return null;
    String login = loginObj.toString().trim();
    if (login.isBlank()) return null;

    Usuario u = usuarioRepository.findByLogin(login).orElse(null);
    if (u == null) return null;
    String email = u.getEmail();
    if (email == null) return null;
    email = email.trim();
    return email.isBlank() ? null : email;
  }
}

