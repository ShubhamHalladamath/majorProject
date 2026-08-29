package shub.smartContest.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "judge")
@Data
public class WorkerConfig {
    private int workers = 4;
    private int queueCapacity = 1000;
    private long pollDelayMs = 500;
    private long pollTimeoutMs = 30000;
}
