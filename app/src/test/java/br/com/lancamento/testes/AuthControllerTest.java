package br.com.lancamento.testes;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import br.com.lancamento.domain.Usuario;
import br.com.lancamento.repo.UsuarioRepository;
import br.com.lancamento.web.AuthController;
import java.util.Optional;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Tag("auth")
class AuthControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private UsuarioRepository usuarioRepository;

  @Test
  void login_credenciaisValidas_redirecionaParaHome() throws Exception {
    Usuario u = new Usuario();
    u.setLogin("admin");
    u.setSenha("123");
    u.setSituacao("ATIVO");

    when(usuarioRepository.findByLoginAndSenha("admin", "123")).thenReturn(Optional.of(u));

    mockMvc
        .perform(post("/login").param("login", "admin").param("senha", "123"))
        .andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrl("/lancamentos"));
  }

  @Test
  void login_credenciaisInvalidas_retornaMensagemDeErro() throws Exception {
    when(usuarioRepository.findByLoginAndSenha("admin", "errada")).thenReturn(Optional.empty());

    mockMvc
        .perform(post("/login").param("login", "admin").param("senha", "errada"))
        .andExpect(status().isOk())
        .andExpect(view().name("auth/login"))
        .andExpect(model().attributeExists("error"));
  }
}
