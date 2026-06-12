package br.com.lancamento.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalModelAttributes {

    @Value("${APP_ENV:Produção}")
    private String appEnv;

    @ModelAttribute("appEnv")
    public String appEnv() {
        return appEnv;
    }
}
