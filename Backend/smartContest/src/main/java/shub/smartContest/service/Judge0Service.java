package shub.smartContest.service;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import shub.smartContest.dto.*;

import java.util.List;

@Service
public class Judge0Service {

    private final WebClient webClient;

    public Judge0Service(WebClient webClient) {
        this.webClient = webClient;
    }

    public List<Judge0Token> createBatch(List<Judge0Submission> submissions) {
        Judge0BatchRequest request = new Judge0BatchRequest(submissions);
        return webClient.post()
                .uri(uriBuilder -> uriBuilder.path("/submissions/batch")
                        .queryParam("base64_encoded", "false")
                        .build())
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(Judge0Token.class)
                .collectList()
                .block();
    }

    public List<Judge0Result> getBatchResults(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return List.of();
        }
        String tokensParam = String.join(",", tokens);
        Judge0BatchResponse response = webClient.get()
                .uri(uriBuilder -> uriBuilder.path("/submissions/batch")
                        .queryParam("tokens", tokensParam)
                        .queryParam("base64_encoded", "false")
                        .queryParam("fields", "stdout,stderr,compile_output,message,status,time,memory,exit_code,exit_signal,token")
                        .build())
                .retrieve()
                .bodyToMono(Judge0BatchResponse.class)
                .block();
        return response != null ? response.getSubmissions() : List.of();
    }
}
