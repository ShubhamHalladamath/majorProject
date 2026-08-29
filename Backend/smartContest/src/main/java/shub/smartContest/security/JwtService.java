package shub.smartContest.security;

import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class JwtService {
    private static final String SECRET = "your-very-secure-and-long-secret-key-for-smart-contest-platform-jwt-signing";
    private static final long EXPIRATION_MS = 86400000; // 1 day

    public String generateToken(String username, String role, Long userId) {
        try {
            String header = Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8)
            );
            
            long iat = System.currentTimeMillis() / 1000;
            long exp = iat + (EXPIRATION_MS / 1000);
            
            String payloadJson = String.format(
                "{\"sub\":\"%s\",\"role\":\"%s\",\"userId\":%d,\"iat\":%d,\"exp\":%d}",
                username, role, userId, iat, exp
            );
            String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                payloadJson.getBytes(StandardCharsets.UTF_8)
            );
            
            String data = header + "." + payload;
            String signature = sign(data, SECRET);
            
            return data + "." + signature;
        } catch (Exception e) {
            log.error("Failed to generate token", e);
            throw new RuntimeException("Token generation error", e);
        }
    }

    public boolean validateToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return false;
            
            String data = parts[0] + "." + parts[1];
            String expectedSig = sign(data, SECRET);
            if (!MessageDigest.isEqual(parts[2].getBytes(StandardCharsets.UTF_8), expectedSig.getBytes(StandardCharsets.UTF_8))) {
                return false;
            }
            
            // Check expiration
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            long exp = extractExp(payload);
            return exp > (System.currentTimeMillis() / 1000);
        } catch (Exception e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        try {
            String[] parts = token.split("\\.");
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            return extractClaim(payload, "sub");
        } catch (Exception e) {
            return null;
        }
    }

    public String extractRole(String token) {
        try {
            String[] parts = token.split("\\.");
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            return extractClaim(payload, "role");
        } catch (Exception e) {
            return null;
        }
    }

    public Long extractUserId(String token) {
        try {
            String[] parts = token.split("\\.");
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            return Long.parseLong(extractClaim(payload, "userId"));
        } catch (Exception e) {
            return null;
        }
    }

    private String sign(String data, String secret) throws Exception {
        Mac sha256HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256HMAC.init(secretKey);
        byte[] hash = sha256HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
    }

    private String extractClaim(String payloadJson, String claim) {
        String search = "\"" + claim + "\":";
        int idx = payloadJson.indexOf(search);
        if (idx == -1) return null;
        int start = idx + search.length();
        if (payloadJson.charAt(start) == '"') {
            int end = payloadJson.indexOf('"', start + 1);
            return payloadJson.substring(start + 1, end);
        } else {
            int end1 = payloadJson.indexOf(',', start);
            int end2 = payloadJson.indexOf('}', start);
            int end = (end1 == -1) ? end2 : ((end2 == -1) ? end1 : Math.min(end1, end2));
            return payloadJson.substring(start, end).trim();
        }
    }

    private long extractExp(String payloadJson) {
        String claim = extractClaim(payloadJson, "exp");
        return claim != null ? Long.parseLong(claim) : 0L;
    }
}
