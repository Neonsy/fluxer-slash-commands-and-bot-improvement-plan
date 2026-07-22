# Outgoing HTTP Interaction Delivery

Status: repository-derived security/operations design under QAD-070 through QAD-077 and QAD-184.

## Ownership and deadline

A dedicated `interaction_delivery` domain owns endpoint verification, DNS-safe connection setup, Ed25519 signing, deadline-bounded send/retry, endpoint health, and terminal delivery status. It does not use the generic worker lane/DLQ because an initial acknowledgement cannot be replayed after three seconds.

Invocation durably creates the interaction, response-token hash, delivery configuration generation, and terminal-status slot before scheduling delivery. A bounded in-process dispatcher begins immediately. Loss of the process may yield a truthful delivery failure but cannot later deliver an expired interaction.

Default reviewed limits:

- maximum 50 in-flight HTTP deliveries per application endpoint;
- maximum 100 queued-but-not-started deliveries per application;
- maximum 1000 in-flight deliveries per API process;
- queued work must begin with at least 500 ms remaining before the acknowledgement deadline or fail fast as overloaded;
- canonical request body maximum 512 KiB and response body maximum 1 MiB;
- one transient retry only when at least 500 ms remains.

These constants bound a new untrusted outbound surface and may be tuned with evidence; the public contract remains the three-second deadline and returned health/rate-limit state, not these exact internal numbers.

## SSRF and DNS rebinding defense

Endpoint registration first uses `validateOutboundEndpointUrl` with HTTPS required, localhost/private literals rejected, URL credentials/query/fragment rejected, and redirects disabled. Delivery then adds the DNS protections the current syntactic utility does not provide:

1. resolve A and AAAA with a 500 ms bound and at most eight accepted answers;
2. normalize every answer through `isPublicIpAddress`; reject the request if any answer is non-public or prohibited;
3. choose and pin one validated address for that connection while preserving the original hostname for TLS SNI and certificate verification;
4. do not allow the HTTP client to perform a second unvalidated resolution;
5. re-resolve and revalidate for every retry and endpoint probe;
6. cache positive public results for at most the lower of DNS TTL and 60 seconds; never cache an answer across a non-public result;
7. block IPv4/IPv6 loopback, private, shared, link-local, documentation, benchmark, multicast, reserved, translation, and cloud metadata ranges.

Only ports 443 and 8443 are accepted in production initially. A self-hosted development override is instance configuration, disabled by default, and is visibly marked unsafe; applications cannot request it.

## Request contract

- `POST` the exact canonical JSON body with `Content-Type: application/json` and no credentials/cookies.
- Sign `timestamp || raw_body` with the active application Ed25519 key.
- Send Discord-compatible `X-Signature-Ed25519` and `X-Signature-Timestamp`, plus non-secret `X-Fluxer-Key-Id`, `X-Fluxer-Delivery-Attempt`, and `X-Fluxer-Trace-Id`.
- Do not follow redirects, negotiate cleartext downgrade, reuse cookies, forward proxy credentials, or include internal headers.
- Accept only a bounded JSON interaction callback or an empty accepted response defined by QAD-182. Stop reading at the response-size limit.

The overall three-second acknowledgement deadline is authoritative. Connection, TLS, write, and response waits all use the remaining absolute deadline rather than independent timeouts that could add beyond it.

## Retry classification

Attempt two reuses the exact interaction/body and is allowed only for connection reset/refusal, timeout before a valid response, HTTP `408`, `425`, `429`, or `5xx`, with sufficient remaining deadline. DNS prohibition, TLS/certificate failure, redirect, invalid response shape, body overflow, and ordinary `4xx` are not retried. Applications deduplicate by interaction ID.

## Circuit breaker and availability

Health is scoped to the application endpoint, not one community. A rolling 60-second window opens the circuit after either:

- five consecutive failed interactions; or
- at least 20 samples with 50 percent or more failures.

Endpoint verification failures count for endpoint health but do not affect an active different transport. User cancellation and Fluxer-side policy/permission rejection do not count. A valid acknowledgement is delivery-health success even if later application work fails; it is not by itself component-input commit or workflow success under QAD-060.

Opening the circuit marks the endpoint `UNHEALTHY`, stops new interaction delivery, and makes HTTP-backed commands/controls unavailable rather than failing after invocation. Fluxer sends signed type-1 health probes after 30 seconds, 2 minutes, 10 minutes, and then every 30 minutes. Two consecutive successful probes close the circuit; lifting it authorizes only new interactions. Application owners may request an immediate verification probe subject to a five-minute cooldown, but cannot force health state.

## Terminal records, telemetry, and dead letters

Every interaction stores delivery state, attempt count, safe failure class, timestamps, endpoint configuration/key generations, and trace ID for 24 hours. It never stores response tokens, signatures, DNS answers, raw bodies, submitted values, response bodies, or arbitrary remote error text in logs/metrics.

Required metrics are low-cardinality totals/histograms for queued/in-flight/rejected deliveries, DNS/TCP/TLS/TTFB/total latency, attempts, outcome class, breaker state, verification, payload sizes, and deadline remaining. Application/interaction IDs belong in access-controlled traces, not metric labels. Alert on sustained global delivery failure, dispatcher saturation, DNS-policy rejections, unhealthy endpoint growth, and signing/key-store failure.

There is no replayable interaction DLQ. A terminal metadata-only failure record supports developer/operator diagnosis and aggregate alerting; its payload cannot be re-driven after the acknowledgement deadline. Generic worker dead-letter tooling must not offer a `Retry` action for interaction delivery.

## Evidence and classification

- `packages/hono/src/security/OutboundEndpoint.ts` already rejects unsafe schemes, credentials, query/fragment, localhost, private literals, and absolute redirected paths.
- `packages/ip_utils/src/IpAddress.ts` already supplies normalized public-IP classification including reserved IPv4/IPv6 ranges.
- Fluxer's generic worker has bounded lanes and a DLQ, but its 15-second-or-longer acknowledgement model is incompatible with a three-second interaction response.
- This extends existing URL/IP primitives and observability patterns while intentionally creating a deadline-owned dispatcher rather than misusing durable background retries.
