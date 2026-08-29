package shub.smartContest.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ContestNotActiveException extends RuntimeException {
    public ContestNotActiveException(String message) {
        super(message);
    }
}
