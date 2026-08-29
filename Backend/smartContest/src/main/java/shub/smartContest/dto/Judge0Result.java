package shub.smartContest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Judge0Result {

    private String stdout;
    
    private String stderr;
    
    @JsonProperty("compile_output")
    private String compileOutput;
    
    private String message;
    
    private Judge0Status status;
    
    private Double time;
    
    private Double memory;
    
    @JsonProperty("exit_code")
    private Integer exitCode;
    
    @JsonProperty("exit_signal")
    private Integer exitSignal;
    
    private String token;
}
