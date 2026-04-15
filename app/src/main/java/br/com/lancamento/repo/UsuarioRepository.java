package br.com.lancamento.repo;

import br.com.lancamento.domain.Usuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
  Optional<Usuario> findByLoginAndSenha(String login, String senha);

  Optional<Usuario> findByLogin(String login);
}

