package br.com.lancamento.web;

import br.com.lancamento.repo.UsuarioRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class AuthController {
  public static final String SESSION_USER = "AUTH_USER";

  private final UsuarioRepository usuarioRepository;

  @Value("${APP_ENV:Produção}")
  private String appEnv;

  public AuthController(UsuarioRepository usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  @GetMapping("/login")
  public String loginPage(Model model) {
    model.addAttribute("appEnv", appEnv);
    return "auth/login";
  }

  @PostMapping("/login")
  public String doLogin(
      @RequestParam String login,
      @RequestParam String senha,
      HttpSession session,
      Model model) {
    model.addAttribute("appEnv", appEnv);
    var user = usuarioRepository.findByLoginAndSenha(login, senha).orElse(null);
    if (user == null) {
      model.addAttribute("error", "Login ou senha inválidos.");
      return "auth/login";
    }
    if (!"ATIVO".equalsIgnoreCase(user.getSituacao())) {
      model.addAttribute("error", "Usuário inativo.");
      return "auth/login";
    }
    session.setAttribute(SESSION_USER, user.getLogin());
    return "redirect:/lancamentos";
  }

  @PostMapping("/logout")
  public String logout(HttpSession session) {
    session.invalidate();
    return "redirect:/login";
  }
}
