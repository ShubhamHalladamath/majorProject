package shub.smartContest.service;

import org.springframework.stereotype.Service;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Base64;
import java.util.UUID;

@Service
public class ImageStorageService {

    private final String storageRootPath;

    public ImageStorageService() {
        // Use user.dir to store images inside the project directory
        String projectPath = System.getProperty("user.dir");
        this.storageRootPath = projectPath + File.separator + "storage" + File.separator + "proctoring";
        
        File dir = new File(storageRootPath);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }

    /**
     * Saves a base64 encoded image to the filesystem.
     * @return the relative path of the saved file.
     */
    public String saveImage(Long contestId, Long studentId, Long sessionId, String deviceType, Integer sequenceNumber, String base64Data) throws IOException {
        // Clean base64 prefix if present (e.g., "data:image/jpeg;base64,")
        String cleanBase64 = base64Data;
        if (cleanBase64.contains(",")) {
            cleanBase64 = cleanBase64.split(",")[1];
        }

        byte[] imageBytes = Base64.getMimeDecoder().decode(cleanBase64);

        // Build directory structure: storage/proctoring/contest-X/student-Y/session-Z/deviceType/
        String relativeFolder = "contest-" + contestId + File.separator +
                               "student-" + studentId + File.separator +
                               "session-" + sessionId + File.separator +
                               deviceType.toLowerCase();

        File folder = new File(storageRootPath + File.separator + relativeFolder);
        if (!folder.exists()) {
            folder.mkdirs();
        }

        String filename = String.format("%03d.jpg", sequenceNumber);
        File file = new File(folder, filename);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(imageBytes);
        }

        // Return path relative to storageRootPath
        return relativeFolder + File.separator + filename;
    }

    /**
     * Reads image bytes from file storage.
     */
    public byte[] getImageBytes(String relativePath) throws IOException {
        File file = new File(storageRootPath + File.separator + relativePath);
        if (!file.exists()) {
            throw new IOException("File not found: " + relativePath);
        }
        return Files.readAllBytes(file.toPath());
    }
}
