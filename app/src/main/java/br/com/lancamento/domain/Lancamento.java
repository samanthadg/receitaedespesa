package br.com.lancamento.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "lancamento")
public class Lancamento {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 200)
  @NotBlank
  @Size(max = 200)
  private String descricao;

  @Column(name = "data_lancamento", nullable = false)
  @NotNull
  private LocalDate dataLancamento;

  @Column(nullable = false, precision = 14, scale = 2)
  @NotNull
  @Positive
  private BigDecimal valor;

  @Enumerated(EnumType.STRING)
  @Column(name = "tipo_lancamento", nullable = false, length = 20)
  @NotNull
  private TipoLancamento tipoLancamento;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  @NotNull
  private Situacao situacao;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getDescricao() {
    return descricao;
  }

  public void setDescricao(String descricao) {
    this.descricao = descricao;
  }

  public LocalDate getDataLancamento() {
    return dataLancamento;
  }

  public void setDataLancamento(LocalDate dataLancamento) {
    this.dataLancamento = dataLancamento;
  }

  public BigDecimal getValor() {
    return valor;
  }

  public void setValor(BigDecimal valor) {
    this.valor = valor;
  }

  public TipoLancamento getTipoLancamento() {
    return tipoLancamento;
  }

  public void setTipoLancamento(TipoLancamento tipoLancamento) {
    this.tipoLancamento = tipoLancamento;
  }

  public Situacao getSituacao() {
    return situacao;
  }

  public void setSituacao(Situacao situacao) {
    this.situacao = situacao;
  }
}

