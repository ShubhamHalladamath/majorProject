package shub.smartContest.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.proctoring.*;
import shub.smartContest.entity.User;
import shub.smartContest.repository.UserRepository;
import shub.smartContest.security.SecurityUser;
import shub.smartContest.service.ProctoringService;

import java.util.List;

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

    private final ProctoringService proctoringService;
    private final UserRepository userRepository;

    public ProctoringController(ProctoringService proctoringService, UserRepository userRepository) {
        this.proctoringService = proctoringService;
        this.userRepository = userRepository;
    }

    @PostMapping("/session/create")
    public ResponseEntity<ProctoringSessionResponse> createSession(@RequestParam Long contestId) {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(proctoringService.createSession(contestId, user.getId()));
    }

    @GetMapping("/session/active")
    public ResponseEntity<ProctoringSessionResponse> getActiveSession(@RequestParam Long contestId) {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(proctoringService.getActiveSession(contestId, user.getId()));
    }

    @PostMapping("/demo-photos")
    public ResponseEntity<Void> uploadDemoPhotos(@RequestBody DemoPhotosRequest request) {
        User user = getAuthenticatedUser();
        proctoringService.uploadDemoPhotos(request, user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/session/{sessionId}/status")
    public ResponseEntity<ProctoringSessionResponse> getSessionStatus(@PathVariable Long sessionId) {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(proctoringService.getSessionStatus(sessionId, user.getId()));
    }

    @PostMapping("/session/{sessionId}/start")
    public ResponseEntity<ProctoringSessionResponse> startSession(@PathVariable Long sessionId) {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(proctoringService.startSession(sessionId, user.getId()));
    }

    @PostMapping("/session/{sessionId}/end")
    public ResponseEntity<ProctoringSessionResponse> endSession(@PathVariable Long sessionId) {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(proctoringService.endSession(sessionId, user.getId()));
    }

    @GetMapping("/pair")
    public ResponseEntity<PairingDetailsResponse> verifyPairingToken(@RequestParam String token) {
        return ResponseEntity.ok(proctoringService.verifyPairingToken(token));
    }

    @PostMapping("/pair/confirm")
    public ResponseEntity<ProctoringSessionResponse> confirmPairing(@RequestParam String token) {
        return ResponseEntity.ok(proctoringService.confirmPairing(token));
    }

    @PostMapping("/photo")
    public ResponseEntity<Void> uploadPhoto(@RequestBody ProctoringPhotoRequest request) {
        if (request.getPairingToken() != null && !request.getPairingToken().isEmpty()) {
            // Upload from mobile (uses token auth)
            proctoringService.uploadMobilePhoto(request);
        } else {
            // Upload from laptop (uses authenticated session)
            User user = getAuthenticatedUser();
            proctoringService.uploadLaptopPhoto(request, user.getId());
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/violation")
    public ResponseEntity<Void> logViolation(@RequestBody ViolationRequest request) {
        User user = getAuthenticatedUser();
        proctoringService.logViolation(request, user.getId());
        return ResponseEntity.ok().build();
    }

    // --- Admin Endpoints ---

    @GetMapping("/admin/sessions/contest/{contestId}")
    public ResponseEntity<List<AdminProctoringSessionSummary>> getContestProctoringSummaries(@PathVariable Long contestId) {
        return ResponseEntity.ok(proctoringService.getContestProctoringSummaries(contestId));
    }

    @GetMapping("/admin/session/{sessionId}")
    public ResponseEntity<AdminProctoringSessionDetail> getSessionDetail(@PathVariable Long sessionId) {
        return ResponseEntity.ok(proctoringService.getSessionDetail(sessionId));
    }

    @GetMapping("/admin/images/{imageId}/file")
    public ResponseEntity<byte[]> getProctoringImageFile(@PathVariable Long imageId) {
        byte[] imageBytes = proctoringService.getProctoringImageFile(imageId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_JPEG);
        return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);
    }

    // --- Helper ---

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
}
