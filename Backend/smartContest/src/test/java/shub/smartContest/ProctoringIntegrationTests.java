package shub.smartContest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.test.context.support.WithMockUser;
import shub.smartContest.controller.ProctoringController;
import shub.smartContest.dto.proctoring.*;
import shub.smartContest.dto.contest.EnrollmentResponse;
import shub.smartContest.entity.*;
import shub.smartContest.exception.ForbiddenException;
import shub.smartContest.repository.*;
import shub.smartContest.service.EnrollmentService;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ProctoringIntegrationTests {

    @Autowired
    private ProctoringController proctoringController;

    @Autowired
    private ProctoringSessionRepository sessionRepository;

    @Autowired
    private ProctoringImageRepository imageRepository;

    @Autowired
    private ProctoringEventRepository eventRepository;

    @Autowired
    private ProctoringAnalysisRepository analysisRepository;

    @Autowired
    private ContestRepository contestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EnrollmentService enrollmentService;

    @Autowired
    private ContestParticipantRepository participantRepository;

    private User testUser;
    private Contest testContest;

    @BeforeEach
    void setup() {
        analysisRepository.deleteAll();
        imageRepository.deleteAll();
        eventRepository.deleteAll();
        sessionRepository.deleteAll();
        participantRepository.deleteAll();
        contestRepository.deleteAll();
        userRepository.deleteAll();

        // Setup common user
        testUser = User.builder()
                .username("testuser")
                .email("testuser@example.com")
                .password("password")
                .role(Role.USER)
                .enabled(true)
                .build();
        testUser = userRepository.save(testUser);

        // Setup common contest
        testContest = Contest.builder()
                .title("Proctoring Test Contest")
                .description("Desc")
                .startTime(LocalDateTime.now().minusHours(1))
                .endTime(LocalDateTime.now().plusHours(2))
                .status(ContestStatus.LIVE)
                .createdBy(1L)
                .duration(60)
                .build();
        testContest = contestRepository.save(testContest);
    }

    @Test
    @WithMockUser(username = "testuser", roles = "USER")
    void testProctoringLifecycleFlow() {
        // Enroll user first
        enrollmentService.enroll(testContest.getId(), testUser.getId());

        // Try to start contest before session creation - should fail
        assertThrows(ForbiddenException.class, () -> enrollmentService.startContest(testContest.getId(), testUser.getId()));

        // 1. Create proctoring session
        ResponseEntity<ProctoringSessionResponse> createResponse = proctoringController.createSession(testContest.getId());
        assertEquals(HttpStatus.OK, createResponse.getStatusCode());
        assertNotNull(createResponse.getBody());
        Long sessionId = createResponse.getBody().getId();
        String pairingToken = createResponse.getBody().getPairingToken();
        assertEquals("CREATED", createResponse.getBody().getStatus());

        // Try to start contest - should fail since proctoring state is CREATED
        assertThrows(ForbiddenException.class, () -> enrollmentService.startContest(testContest.getId(), testUser.getId()));

        // 2. Upload 5 demo verification photos
        List<String> mockPhotos = List.of(
                "data:image/jpeg;base64,mockphoto1",
                "data:image/jpeg;base64,mockphoto2",
                "data:image/jpeg;base64,mockphoto3",
                "data:image/jpeg;base64,mockphoto4",
                "data:image/jpeg;base64,mockphoto5"
        );
        DemoPhotosRequest demoRequest = new DemoPhotosRequest(sessionId, mockPhotos);
        ResponseEntity<Void> demoResponse = proctoringController.uploadDemoPhotos(demoRequest);
        assertEquals(HttpStatus.OK, demoResponse.getStatusCode());

        // Verify status moved to WAITING_FOR_MOBILE
        ResponseEntity<ProctoringSessionResponse> statusRes = proctoringController.getSessionStatus(sessionId);
        assertEquals("WAITING_FOR_MOBILE", statusRes.getBody().getStatus());

        // Try to start contest - should fail since mobile is not connected yet
        assertThrows(ForbiddenException.class, () -> enrollmentService.startContest(testContest.getId(), testUser.getId()));

        // 3. Mobile verification check via pairing token
        ResponseEntity<PairingDetailsResponse> pairCheck = proctoringController.verifyPairingToken(pairingToken);
        assertEquals(HttpStatus.OK, pairCheck.getStatusCode());
        assertNotNull(pairCheck.getBody());
        assertEquals(sessionId, pairCheck.getBody().getSessionId());
        assertEquals("testuser", pairCheck.getBody().getStudentUsername());

        // 4. Confirm mobile pairing
        ResponseEntity<ProctoringSessionResponse> confirmRes = proctoringController.confirmPairing(pairingToken);
        assertEquals(HttpStatus.OK, confirmRes.getStatusCode());
        assertEquals("MOBILE_CONNECTED", confirmRes.getBody().getStatus());

        // Verify status is now MOBILE_CONNECTED
        statusRes = proctoringController.getSessionStatus(sessionId);
        assertEquals("MOBILE_CONNECTED", statusRes.getBody().getStatus());

        // Start contest - should now succeed since status is MOBILE_CONNECTED
        EnrollmentResponse enrollRes = enrollmentService.startContest(testContest.getId(), testUser.getId());
        assertNotNull(enrollRes.getStartedAt());

        // 5. Start the workspace session
        ResponseEntity<ProctoringSessionResponse> startRes = proctoringController.startSession(sessionId);
        assertEquals(HttpStatus.OK, startRes.getStatusCode());
        assertEquals("ACTIVE", startRes.getBody().getStatus());
        assertNotNull(startRes.getBody().getStartedAt());

        // 6. Upload laptop photo
        ProctoringPhotoRequest laptopPhoto = ProctoringPhotoRequest.builder()
                .sessionId(sessionId)
                .deviceType(DeviceType.LAPTOP)
                .sequenceNumber(1)
                .capturedAt(LocalDateTime.now())
                .imageBase64("data:image/jpeg;base64,laptopframe1")
                .build();
        ResponseEntity<Void> uploadRes = proctoringController.uploadPhoto(laptopPhoto);
        assertEquals(HttpStatus.OK, uploadRes.getStatusCode());

        // 7. Upload mobile photo (uses token pairing)
        ProctoringPhotoRequest mobilePhoto = ProctoringPhotoRequest.builder()
                .pairingToken(pairingToken)
                .deviceType(DeviceType.MOBILE)
                .sequenceNumber(1)
                .capturedAt(LocalDateTime.now())
                .imageBase64("data:image/jpeg;base64,mobileframe1")
                .build();
        uploadRes = proctoringController.uploadPhoto(mobilePhoto);
        assertEquals(HttpStatus.OK, uploadRes.getStatusCode());

        // 8. Log browser violations
        ViolationRequest violation = new ViolationRequest(sessionId, "TAB_SWITCH", "Student switched tab");
        ResponseEntity<Void> violRes = proctoringController.logViolation(violation);
        assertEquals(HttpStatus.OK, violRes.getStatusCode());

        // 9. Verify Admin auditing lists
        ResponseEntity<List<AdminProctoringSessionSummary>> adminSummaries = proctoringController.getContestProctoringSummaries(testContest.getId());
        assertEquals(HttpStatus.OK, adminSummaries.getStatusCode());
        assertEquals(1, adminSummaries.getBody().size());
        assertEquals(1L, adminSummaries.getBody().get(0).getViolationsCount());

        // Verify Admin detail retrieval
        ResponseEntity<AdminProctoringSessionDetail> adminDetail = proctoringController.getSessionDetail(sessionId);
        assertEquals(HttpStatus.OK, adminDetail.getStatusCode());
        assertNotNull(adminDetail.getBody());
        assertEquals(1, adminDetail.getBody().getLaptopPhotosCount());
        assertEquals(1, adminDetail.getBody().getMobilePhotosCount());
        assertEquals(7, adminDetail.getBody().getImages().size());

        // 10. End proctoring session
        ResponseEntity<ProctoringSessionResponse> endRes = proctoringController.endSession(sessionId);
        assertEquals(HttpStatus.OK, endRes.getStatusCode());
        assertEquals("ENDED", endRes.getBody().getStatus());
    }
}
