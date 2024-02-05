package com.ssafy.ploud.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  public static final String ALLOWED_METHOD_NAMES = "GET,HEAD,POST,PUT,DELETE,TRACE,OPTIONS,PATCH";

  @Override
  public void addCorsMappings(final CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins("http://localhost:8080")
        .allowedMethods(ALLOWED_METHOD_NAMES.split(","))
        .allowCredentials(true)
        .exposedHeaders(HttpHeaders.LOCATION);

//    ("https://i10e207.p.ssafy.io")
  }

}
