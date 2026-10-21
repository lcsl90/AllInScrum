# Test-Zertifikat

Selbst signiertes Zertifikat für `localhost` und `127.0.0.1` – **nur für Tests**, niemals produktiv
verwenden. Neu erzeugen:

```bash
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 36500 \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
  -keyout test-key.pem -out test-cert.pem
```
