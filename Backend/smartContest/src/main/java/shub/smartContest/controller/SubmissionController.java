package shub.smartContest.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.SubmissionResultResponse;
import shub.smartContest.dto.SubmitRequest;
import shub.smartContest.dto.SubmitResponse;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.exception.SystemBusyException;
import shub.smartContest.service.SubmissionResultService;
import shub.smartContest.service.SubmissionService;

import java.util.List;


import org.springframework.security.core.context.SecurityContextHolder;
import shub.smartContest.security.SecurityUser;
import shub.smartContest.entity.Role;

import shub.smartContest.repository.UserRepository;
import shub.smartContest.entity.User;

@RestController
@RequestMapping("/api/submissions")
@Slf4j
public class SubmissionController {

    private final SubmissionService submissionService;
    private final SubmissionResultService submissionResultService;
    private final UserRepository userRepository;

    public SubmissionController(SubmissionService submissionService,
                                SubmissionResultService submissionResultService,
                                UserRepository userRepository) {
        this.submissionService = submissionService;
        this.submissionResultService = submissionResultService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<SubmitResponse> submitCode(@RequestBody SubmitRequest request) {
        User user = getAuthenticatedUser();
        SubmitResponse response = submissionService.submitCode(request, user.getId());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/my")
    public ResponseEntity<List<SubmissionResultResponse>> getMySubmissions() {
        User user = getAuthenticatedUser();
        List<SubmissionResultResponse> response = submissionResultService.getMySubmissions(user.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SubmissionResultResponse> getSubmissionResult(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        boolean isAdmin = user.getRole() == Role.ADMIN;
        SubmissionResultResponse response = submissionResultService.getSubmissionResult(id, user.getId(), isAdmin);
        return ResponseEntity.ok(response);
    }

    private User getAuthenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof SecurityUser) {
            return ((SecurityUser) principal).getUser();
        }
        String username;
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            username = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new shub.smartContest.exception.ResourceNotFoundException("User not found: " + username));
    }


    @ExceptionHandler(SystemBusyException.class)
    public ResponseEntity<SubmitResponse> handleSystemBusy(SystemBusyException ex) {
        SubmitResponse response = SubmitResponse.builder()
                .status("SYSTEM_BUSY")
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }
}

