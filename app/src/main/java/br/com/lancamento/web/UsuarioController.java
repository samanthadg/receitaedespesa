package br.com.lancamento.web;

import br.com.lancamento.domain.Usuario;
import br.com.lancamento.repo.UsuarioRepository;
import jakarta.servlet.http.HttpSession;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/usuarios")
public class UsuarioController {
  private static final Set<String> CAMPOS_ORDENACAO = Set.of("id", "nome", "login", "situacao");

  private final UsuarioRepository usuarioRepository;

  public UsuarioController(UsuarioRepository usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  @GetMapping
  public String listar(
      @RequestParam(defaultValue = "nome") String campo,
      @RequestParam(defaultValue = "asc") String direcao,
      Model model) {
    String campoOrdenacao = CAMPOS_ORDENACAO.contains(campo) ? campo : "nome";
    Sort.Direction direction = "desc".equalsIgnoreCase(direcao) ? Sort.Direction.DESC : Sort.Direction.ASC;
    var lista = usuarioRepository.findAll(Sort.by(direction, campoOrdenacao).and(Sort.by("id")));
    model.addAttribute("usuarios", lista);
    model.addAttribute("campo", campoOrdenacao);
    model.addAttribute("direcao", direction.name().toLowerCase());
    return "usuarios/lista";
  }

  @PostMapping
  public String adicionar(
      @RequestParam String nome,
      @RequestParam String login,
      @RequestParam String senha,
      @RequestParam String situacao,
      RedirectAttributes redirectAttributes) {
    String loginNorm = login.trim();
    if (usuarioRepository.findByLogin(loginNorm).isPresent()) {
      redirectAttributes.addFlashAttribute("erro", "Já existe um usuário com esse login.");
      return "redirect:/usuarios";
    }

    try {
      Usuario u = new Usuario();
      u.setNome(nome.trim());
      u.setLogin(loginNorm);
      u.setSenha(senha);
      u.setSituacao(situacao.trim());
      usuarioRepository.save(u);
      redirectAttributes.addFlashAttribute("msg", "Usuário criado com sucesso.");
    } catch (Exception e) {
      redirectAttributes.addFlashAttribute("erro", "Não foi possível criar o usuário.");
    }
    return "redirect:/usuarios";
  }

  @GetMapping("/{id}/editar")
  public String editar(@PathVariable Long id, Model model, RedirectAttributes redirectAttributes) {
    var usuario = usuarioRepository.findById(id).orElse(null);
    if (usuario == null) {
      redirectAttributes.addFlashAttribute("erro", "Usuário não encontrado.");
      return "redirect:/usuarios";
    }
    model.addAttribute("usuario", usuario);
    return "usuarios/editar";
  }

  @PostMapping("/{id}")
  public String atualizar(
      @PathVariable Long id,
      @RequestParam String nome,
      @RequestParam String login,
      @RequestParam(required = false) String senha,
      @RequestParam String situacao,
      RedirectAttributes redirectAttributes) {
    var usuario = usuarioRepository.findById(id).orElse(null);
    if (usuario == null) {
      redirectAttributes.addFlashAttribute("erro", "Usuário não encontrado.");
      return "redirect:/usuarios";
    }

    String loginNorm = login.trim();
    var outro = usuarioRepository.findByLogin(loginNorm).orElse(null);
    if (outro != null && !outro.getId().equals(id)) {
      redirectAttributes.addFlashAttribute("erro", "Já existe um usuário com esse login.");
      return "redirect:/usuarios/" + id + "/editar";
    }

    try {
      usuario.setNome(nome.trim());
      usuario.setLogin(loginNorm);
      if (senha != null && !senha.isBlank()) {
        usuario.setSenha(senha);
      }
      usuario.setSituacao(situacao.trim());
      usuarioRepository.save(usuario);
      redirectAttributes.addFlashAttribute("msg", "Usuário atualizado.");
      return "redirect:/usuarios";
    } catch (Exception e) {
      redirectAttributes.addFlashAttribute("erro", "Não foi possível atualizar o usuário.");
      return "redirect:/usuarios/" + id + "/editar";
    }
  }

  @PostMapping("/{id}/excluir")
  public String excluir(
      @PathVariable Long id, HttpSession session, RedirectAttributes redirectAttributes) {
    var usuario = usuarioRepository.findById(id).orElse(null);
    if (usuario == null) {
      redirectAttributes.addFlashAttribute("erro", "Usuário não encontrado.");
      return "redirect:/usuarios";
    }

    Object sessionLogin = session.getAttribute(AuthController.SESSION_USER);
    if (sessionLogin != null && sessionLogin.toString().equalsIgnoreCase(usuario.getLogin())) {
      redirectAttributes.addFlashAttribute("erro", "Você não pode excluir o usuário que está logado.");
      return "redirect:/usuarios";
    }

    try {
      usuarioRepository.deleteById(id);
      redirectAttributes.addFlashAttribute("msg", "Usuário excluído.");
    } catch (Exception e) {
      redirectAttributes.addFlashAttribute("erro", "Não foi possível excluir o usuário.");
    }
    return "redirect:/usuarios";
  }
}

