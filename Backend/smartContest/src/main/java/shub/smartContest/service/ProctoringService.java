package shub.smartContest.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shub.smartContest.dto.proctoring.*;
import shub.smartContest.entity.*;
import shub.smartContest.exception.ForbiddenException;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.repository.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProctoringService {

    private final ProctoringSessionRepository sessionRepository;
    private final ProctoringImageRepository imageRepository;
    private final ProctoringEventRepository eventRepository;
    private final ProctoringAnalysisRepository analysisRepository;
    private final ContestRepository contestRepository;
    private final UserRepository userRepository;
    private final ImageStorageService storageService;

    public ProctoringService(ProctoringSessionRepository sessionRepository,
            ProctoringImageRepository imageRepository,
            ProctoringEventRepository eventRepository,
            ProctoringAnalysisRepository analysisRepository,
            ContestRepository contestRepository,
            UserRepository userRepository,
            ImageStorageService storageService) {
        this.sessionRepository = sessionRepository;
        this.imageRepository = imageRepository;
        this.eventRepository = eventRepository;
        this.analysisRepository = analysisRepository;
        this.contestRepository = contestRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    /**
     * Creates a new proctoring session for a student in a contest.
     */
    public ProctoringSessionResponse createSession(Long contestId, Long studentId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found"));

        // Reuse existing session if it already exists for this contest and student
        Optional<ProctoringSession> existing = sessionRepository.findByContestIdAndStudentId(contestId, studentId);
        if (existing.isPresent()) {
            ProctoringSession session = existing.get();
            // Reset status back to CREATED for a fresh start
            session.setStatus(ProctoringSessionStatus.CREATED);
            session.setPairingToken(UUID.randomUUID().toString());
            session.setStartedAt(null);
            session.setEndedAt(null);
            session.setMobileConnectedAt(null);
            session.setLastLaptopPhotoAt(null);
            session.setLastMobilePhotoAt(null);
            session.setPhotoCount(0);
            session = sessionRepository.save(session);
            logEvent(session.getId(), studentId, contestId, "PROCTORING_CREATED", "Session re-created/reset");
            return mapToResponse(session);
        }

        ProctoringSession session = ProctoringSession.builder()
                .contestId(contestId)
                .studentId(studentId)
                .pairingToken(UUID.randomUUID().toString())
                .status(ProctoringSessionStatus.CREATED)
                .photoCount(0)
                .build();

        session = sessionRepository.save(session);
        logEvent(session.getId(), studentId, contestId, "PROCTORING_CREATED", "New session created");
        return mapToResponse(session);
    }

    /**
     * Gets the active proctoring session for a student in a contest without
     * resetting it.
     */
    public ProctoringSessionResponse getActiveSession(Long contestId, Long studentId) {
        ProctoringSession session = sessionRepository.findByContestIdAndStudentId(contestId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("No active proctoring session found"));
        return mapToResponse(session);
    }

    /**
     * Saves the 5 initial camera demo verification photos.
     */
    public void uploadDemoPhotos(DemoPhotosRequest request, Long studentId) {
        ProctoringSession session = sessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getStudentId().equals(studentId)) {
            throw new ForbiddenException("Unauthorized session access");
        }

        List<String> images = request.getImages();
        if (images == null || images.size() < 5) {
            throw new IllegalArgumentException("Must provide exactly 5 demo images");
        }

        // Save each demo photo
        for (int i = 0; i < 5; i++) {
            try {
                String base64Str = images.get(i);
                if (base64Str.contains(",")) {
                    base64Str = base64Str.split(",")[1];
                }
                byte[] imageBytes = java.util.Base64.getMimeDecoder().decode(base64Str);

                String relativePath = storageService.saveImage(
                        session.getContestId(),
                        studentId,
                        session.getId(),
                        "demo",
                        i + 1,
                        images.get(i));

                ProctoringImage prImg = ProctoringImage.builder()
                        .sessionId(session.getId())
                        .contestId(session.getContestId())
                        .studentId(studentId)
                        .deviceType(DeviceType.LAPTOP) // Mark demo photos as laptop
                        .captureType(CaptureType.DEMO)
                        .sequenceNumber(-(i + 1)) // Use negative sequence numbers for demo photos
                        .capturedAt(LocalDateTime.now())
                        .imagePath(relativePath)
                        .imageData(imageBytes)
                        .uploadStatus("SUCCESS")
                        .build();

                imageRepository.save(prImg);
                System.out.println("[Proctoring Database Log] Saved DEMO photo #" + (i + 1)
                        + " from LAPTOP. Session ID: " + session.getId() + ", Student ID: " + studentId + ", Size: "
                        + imageBytes.length + " bytes");
            } catch (IOException e) {
                throw new RuntimeException("Failed to save demo image: " + e.getMessage());
            }
        }

        session.setStatus(ProctoringSessionStatus.WAITING_FOR_MOBILE);
        sessionRepository.save(session);
        logEvent(session.getId(), studentId, session.getContestId(), "FIVE_DEMO_PHOTOS_COMPLETED",
                "Completed demo photos");
    }

    /**
     * Mobile fetches session details using pairing token.
     */
    public PairingDetailsResponse verifyPairingToken(String token) {
        ProctoringSession session = sessionRepository.findByPairingToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired pairing token"));

        if (session.getStatus() == ProctoringSessionStatus.ENDED
                || session.getStatus() == ProctoringSessionStatus.EXPIRED) {
            throw new ForbiddenException("Proctoring session has already ended or expired");
        }

        Contest contest = contestRepository.findById(session.getContestId())
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found"));

        User student = userRepository.findById(session.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        return PairingDetailsResponse.builder()
                .sessionId(session.getId())
                .contestId(contest.getId())
                .contestTitle(contest.getTitle())
                .studentId(student.getId())
                .studentUsername(student.getUsername())
                .status(session.getStatus().name())
                .startedAt(session.getStartedAt())
                .build();
    }

    /**
     * Mobile confirms pairing.
     */
    public ProctoringSessionResponse confirmPairing(String token) {
        ProctoringSession session = sessionRepository.findByPairingToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid pairing token"));

        if (session.getStatus() == ProctoringSessionStatus.ENDED
                || session.getStatus() == ProctoringSessionStatus.EXPIRED) {
            throw new ForbiddenException("Proctoring session has ended or expired");
        }

        session.setStatus(ProctoringSessionStatus.MOBILE_CONNECTED);
        session.setMobileConnectedAt(LocalDateTime.now());
        session = sessionRepository.save(session);

        logEvent(session.getId(), session.getStudentId(), session.getContestId(), "MOBILE_CONNECTED",
                "Mobile successfully paired");
        return mapToResponse(session);
    }

    /**
     * Polls status of session.
     */
    public ProctoringSessionResponse getSessionStatus(Long sessionId, Long studentId) {
        ProctoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getStudentId().equals(studentId)) {
            throw new ForbiddenException("Unauthorized session access");
        }

        // Check for mobile disconnection (Active session only)
        if (session.getStatus() == ProctoringSessionStatus.ACTIVE && session.getLastMobilePhotoAt() != null) {
            long secondsSinceLastMobilePhoto = java.time.Duration
                    .between(session.getLastMobilePhotoAt(), LocalDateTime.now()).getSeconds();
            if (secondsSinceLastMobilePhoto > 15) {
                // Check if last event was already mobile disconnect to prevent spam logs
                List<ProctoringEvent> events = eventRepository.findBySessionIdOrderByEventTimeAsc(sessionId);
                boolean alreadyLogged = false;
                if (!events.isEmpty()) {
                    ProctoringEvent lastEvent = events.get(events.size() - 1);
                    if ("MOBILE_DISCONNECTED".equals(lastEvent.getEventType())) {
                        alreadyLogged = true;
                    }
                }
                if (!alreadyLogged) {
                    logEvent(sessionId, studentId, session.getContestId(), "MOBILE_DISCONNECTED",
                            "No mobile photos received in 15 seconds");
                }
            }
        }

        return mapToResponse(session);
    }

    /**
     * Starts the proctoring active tracking.
     */
    public ProctoringSessionResponse startSession(Long sessionId, Long studentId) {
        ProctoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getStudentId().equals(studentId)) {
            throw new ForbiddenException("Unauthorized session access");
        }

        session.setStatus(ProctoringSessionStatus.ACTIVE);
        session.setStartedAt(LocalDateTime.now());
        session = sessionRepository.save(session);

        logEvent(sessionId, studentId, session.getContestId(), "PROCTORING_STARTED",
                "Contest proctoring session is active");
        return mapToResponse(session);
    }

    /**
     * Ends the proctoring session.
     */
    public ProctoringSessionResponse endSession(Long sessionId, Long studentId) {
        ProctoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getStudentId().equals(studentId)) {
            throw new ForbiddenException("Unauthorized session access");
        }

        session.setStatus(ProctoringSessionStatus.ENDED);
        session.setEndedAt(LocalDateTime.now());
        // Invalidate pairing token
        session.setPairingToken(UUID.randomUUID().toString() + "-expired");
        session = sessionRepository.save(session);

        logEvent(sessionId, studentId, session.getContestId(), "PROCTORING_STOPPED", "Contest proctoring ended");
        return mapToResponse(session);
    }

    /**
     * Uploads regular contest tracking photo (laptop context).
     */
    public void uploadLaptopPhoto(ProctoringPhotoRequest request, Long studentId) {
        ProctoringSession session = sessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getStudentId().equals(studentId)) {
            throw new ForbiddenException("Unauthorized session access");
        }

        if (session.getStatus() != ProctoringSessionStatus.ACTIVE) {
            throw new ForbiddenException("Session is not active");
        }

        savePhotoMetadata(session, DeviceType.LAPTOP, request.getSequenceNumber(), request.getImageBase64(),
                request.getCapturedAt());
        session.setLastLaptopPhotoAt(LocalDateTime.now());
        sessionRepository.save(session);
    }

    /**
     * Uploads regular contest tracking photo (mobile context via token).
     */
    public void uploadMobilePhoto(ProctoringPhotoRequest request) {
        ProctoringSession session = sessionRepository.findByPairingToken(request.getPairingToken())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid session pairing token"));

        if (session.getStatus() != ProctoringSessionStatus.ACTIVE
                && session.getStatus() != ProctoringSessionStatus.MOBILE_CONNECTED) {
            // Allow uploads if connected or active
            throw new ForbiddenException("Session is not active or connected");
        }

        DeviceType devType = request.getDeviceType() != null ? request.getDeviceType() : DeviceType.MOBILE;
        savePhotoMetadata(session, devType, request.getSequenceNumber(), request.getImageBase64(),
                request.getCapturedAt());
        session.setLastMobilePhotoAt(LocalDateTime.now());
        sessionRepository.save(session);
    }

    /**
     * Logs tab switch / fullscreen violation.
     */
    public void logViolation(ViolationRequest request, Long studentId) {
        ProctoringSession session = sessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getStudentId().equals(studentId)) {
            throw new ForbiddenException("Unauthorized session access");
        }

        logEvent(session.getId(), studentId, session.getContestId(), request.getEventType(), request.getMetadata());
    }

    // Helper: Saves metadata and files to disk
    private void savePhotoMetadata(ProctoringSession session, DeviceType deviceType, Integer seq, String base64,
            LocalDateTime capturedAt) {
        try {
            String base64Str = base64;
            if (base64Str.contains(",")) {
                base64Str = base64Str.split(",")[1];
            }
            byte[] imageBytes = java.util.Base64.getMimeDecoder().decode(base64Str);

            String path = storageService.saveImage(
                    session.getContestId(),
                    session.getStudentId(),
                    session.getId(),
                    deviceType.name(),
                    seq,
                    base64);

            ProctoringImage image = ProctoringImage.builder()
                    .sessionId(session.getId())
                    .contestId(session.getContestId())
                    .studentId(session.getStudentId())
                    .deviceType(deviceType)
                    .captureType(CaptureType.REGULAR)
                    .sequenceNumber(seq)
                    .capturedAt(capturedAt != null ? capturedAt : LocalDateTime.now())
                    .imagePath(path)
                    .imageData(imageBytes)
                    .uploadStatus("SUCCESS")
                    .build();

            image = imageRepository.save(image);
            System.out.println("[Proctoring Database Log] Saved REGULAR photo (Sequence: " + seq + ") from "
                    + deviceType.name() + ". Session ID: " + session.getId() + ", Student ID: " + session.getStudentId()
                    + ", Size: " + imageBytes.length + " bytes");
            session.setPhotoCount(session.getPhotoCount() + 1);

            // Create placeholder analysis record
            ProctoringAnalysis analysis = ProctoringAnalysis.builder()
                    .imageId(image.getId())
                    .sessionId(session.getId())
                    .analysisStatus("PENDING")
                    .build();
            analysisRepository.save(analysis);

        } catch (IOException e) {
            throw new RuntimeException("Failed to save photo: " + e.getMessage());
        }
    }

    /**
     * Admin: Retrieves all student proctoring summaries for contest.
     */
    @Transactional(readOnly = true)
    public List<AdminProctoringSessionSummary> getContestProctoringSummaries(Long contestId) {
        List<ProctoringSession> sessions = sessionRepository.findByContestId(contestId);
        return sessions.stream().map(session -> {
            User student = userRepository.findById(session.getStudentId()).orElse(null);
            String username = student != null ? student.getUsername() : "Unknown";

            // Count violations from events
            List<ProctoringEvent> events = eventRepository.findBySessionIdOrderByEventTimeAsc(session.getId());
            long violations = events.stream()
                    .filter(e -> List.of("TAB_SWITCH", "EXIT_FULLSCREEN", "COPY_ATTEMPT", "CUT_ATTEMPT",
                            "PASTE_ATTEMPT", "MOBILE_DISCONNECTED").contains(e.getEventType()))
                    .count();

            // Determine AI overall status based on analyses
            List<ProctoringAnalysis> analyses = analysisRepository.findBySessionId(session.getId());
            String aiStatus = "PENDING";
            boolean hasSuspicious = false;
            boolean hasCompleted = false;
            for (ProctoringAnalysis analysis : analyses) {
                if ("COMPLETED".equals(analysis.getAnalysisStatus())) {
                    hasCompleted = true;
                    if ((analysis.getSuspicionScore() != null && analysis.getSuspicionScore() > 0.5) ||
                            Boolean.TRUE.equals(analysis.getPhoneDetected()) ||
                            Boolean.TRUE.equals(analysis.getMultipleFaces())) {
                        hasSuspicious = true;
                    }
                }
            }
            if (hasSuspicious) {
                aiStatus = "SUSPICIOUS";
            } else if (hasCompleted) {
                aiStatus = "CLEAR";
            }

            return AdminProctoringSessionSummary.builder()
                    .sessionId(session.getId())
                    .studentId(session.getStudentId())
                    .studentUsername(username)
                    .status(session.getStatus().name())
                    .photoCount(session.getPhotoCount())
                    .lastLaptopPhotoAt(session.getLastLaptopPhotoAt())
                    .lastMobilePhotoAt(session.getLastMobilePhotoAt())
                    .violationsCount(violations)
                    .aiStatus(aiStatus)
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * Admin: Retrieves detail log, images list, and events timeline.
     */
    @Transactional(readOnly = true)
    public AdminProctoringSessionDetail getSessionDetail(Long sessionId) {
        ProctoringSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        Contest contest = contestRepository.findById(session.getContestId())
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found"));

        User student = userRepository.findById(session.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        List<ProctoringImage> images = imageRepository.findBySessionIdOrderBySequenceNumberAsc(sessionId);
        List<ProctoringEvent> events = eventRepository.findBySessionIdOrderByEventTimeAsc(sessionId);
        List<ProctoringAnalysis> analyses = analysisRepository.findBySessionId(sessionId);

        java.util.Map<Long, ProctoringAnalysis> analysisMap = analyses.stream()
                .collect(Collectors.toMap(ProctoringAnalysis::getImageId, a -> a, (a1, a2) -> a1));

        int laptopCount = 0;
        int mobileCount = 0;

        List<AdminImageDetail> imgDetails = new java.util.ArrayList<>();
        for (ProctoringImage img : images) {
            if (img.getCaptureType() == CaptureType.REGULAR) {
                if (img.getDeviceType() == DeviceType.LAPTOP) {
                    laptopCount++;
                } else if (img.getDeviceType() == DeviceType.MOBILE || img.getDeviceType() == DeviceType.MOBILE_FRONT || img.getDeviceType() == DeviceType.MOBILE_BACK) {
                    mobileCount++;
                }
            }

            ProctoringAnalysis analysis = analysisMap.get(img.getId());
            AdminImageDetail detail = AdminImageDetail.builder()
                    .id(img.getId())
                    .sequenceNumber(img.getSequenceNumber())
                    .deviceType(img.getDeviceType().name())
                    .capturedAt(img.getCapturedAt())
                    .fileUrl("/api/proctoring/admin/images/" + img.getId() + "/file")
                    .uploadStatus(img.getUploadStatus())
                    .faceDetected(analysis != null ? analysis.getFaceDetected() : null)
                    .multipleFaces(analysis != null ? analysis.getMultipleFaces() : null)
                    .phoneDetected(analysis != null ? analysis.getPhoneDetected() : null)
                    .suspicionScore(analysis != null ? analysis.getSuspicionScore() : null)
                    .analysisResult(analysis != null ? analysis.getAnalysisResult() : null)
                    .analysisStatus(analysis != null ? analysis.getAnalysisStatus() : "PENDING")
                    .build();
            imgDetails.add(detail);
        }

        return AdminProctoringSessionDetail.builder()
                .sessionId(session.getId())
                .contestId(contest.getId())
                .contestTitle(contest.getTitle())
                .studentId(student.getId())
                .studentUsername(student.getUsername())
                .status(session.getStatus().name())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .mobileConnectedAt(session.getMobileConnectedAt())
                .photoCount(session.getPhotoCount())
                .laptopPhotosCount(laptopCount)
                .mobilePhotosCount(mobileCount)
                .images(imgDetails)
                .events(events)
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] getProctoringImageFile(Long imageId) {
        ProctoringImage image = imageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
        if (image.getImageData() != null) {
            return image.getImageData();
        }
        try {
            return storageService.getImageBytes(image.getImagePath());
        } catch (IOException e) {
            throw new RuntimeException("Failed to read image bytes: " + e.getMessage());
        }
    }

    // Helper: Logs proctoring events
    private void logEvent(Long sessionId, Long studentId, Long contestId, String type, String metadata) {
        ProctoringEvent event = ProctoringEvent.builder()
                .sessionId(sessionId)
                .studentId(studentId)
                .contestId(contestId)
                .eventType(type)
                .eventTime(LocalDateTime.now())
                .metadata(metadata)
                .build();
        eventRepository.save(event);
    }

    // Mapper helper
    private ProctoringSessionResponse mapToResponse(ProctoringSession session) {
        return ProctoringSessionResponse.builder()
                .id(session.getId())
                .contestId(session.getContestId())
                .studentId(session.getStudentId())
                .pairingToken(session.getPairingToken())
                .status(session.getStatus().name())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .mobileConnectedAt(session.getMobileConnectedAt())
                .lastLaptopPhotoAt(session.getLastLaptopPhotoAt())
                .lastMobilePhotoAt(session.getLastMobilePhotoAt())
                .photoCount(session.getPhotoCount())
                .build();
    }
}
