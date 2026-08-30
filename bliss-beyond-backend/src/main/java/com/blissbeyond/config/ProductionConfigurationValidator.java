package com.blissbeyond.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.PriorityOrdered;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@Profile("production")
public class ProductionConfigurationValidator
    implements BeanFactoryPostProcessor, EnvironmentAware, PriorityOrdered {

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        validate(environment);
    }

    static void validate(Environment environment) {
        List<String> missing = new ArrayList<>();
        require(environment, "spring.datasource.url", "DB_URL", missing);
        require(environment, "spring.datasource.username", "DB_USERNAME", missing);
        require(environment, "spring.datasource.password", "DB_PASSWORD", missing);
        require(environment, "spring.mail.host", "MAIL_HOST", missing);
        require(environment, "spring.mail.username", "MAIL_USERNAME", missing);
        require(environment, "spring.mail.password", "MAIL_PASSWORD", missing);
        require(environment, "app.mail.from", "MAIL_FROM", missing);

        int port = environment.getProperty("spring.mail.port", Integer.class, 0);
        if (port <= 0 || port > 65535) {
            missing.add("MAIL_PORT");
        }
        if (!environment.getProperty("spring.mail.properties.mail.smtp.auth", Boolean.class, false)) {
            missing.add("MAIL_SMTP_AUTH=true");
        }
        if (!environment.getProperty("spring.mail.properties.mail.smtp.starttls.enable", Boolean.class, false)) {
            missing.add("MAIL_SMTP_STARTTLS=true");
        }

        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                "Production configuration is incomplete. Configure: " + String.join(", ", missing)
            );
        }
    }

    private static void require(Environment environment, String property, String name, List<String> missing) {
        String value = environment.getProperty(property);
        if (value == null || value.isBlank()) {
            missing.add(name);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
