package br.com.lancamento.repo;

import br.com.lancamento.domain.Lancamento;
import br.com.lancamento.domain.Situacao;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LancamentoRepository extends JpaRepository<Lancamento, Long>, JpaSpecificationExecutor<Lancamento> {
  List<Lancamento> findBySituacao(Situacao situacao);
}

