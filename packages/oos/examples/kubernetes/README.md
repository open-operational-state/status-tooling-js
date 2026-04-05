# Kubernetes Integration

OOS health endpoints work natively with Kubernetes probes — no sidecar, no custom logic.

## How OOS maps to Kubernetes probes

| Kubernetes probe | OOS condition | HTTP status |
|---|---|---|
| **Liveness** | `operational` / `degraded` / `partial-outage` | `200` (alive) |
| | `down` / `maintenance` | `503` (dead — restart) |
| **Readiness** | `operational` / `ready` | `200` (accept traffic) |
| | `not-ready` / `maintenance` | `503` (drain traffic) |
| **Startup** | `initializing` | `200` (still starting — use `failureThreshold` to control timeout) |
| | `down` | `503` (failed to start) |

Kubernetes probes only look at the HTTP status code (`200` = success, anything else = failure). OOS produces the correct status codes automatically via `suggestHttpStatus()`.

> **Note:** `initializing` maps to HTTP `200` because the service is alive and responding — it simply isn't ready for traffic yet. For startup probes, use a separate readiness endpoint that checks initialization state, or combine with `failureThreshold` and `periodSeconds` to control the startup window.

## Example Deployment

See [deployment.yaml](./deployment.yaml) for a complete working example.

```yaml
containers:
  - name: my-api
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 10

    readinessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 3
      periodSeconds: 5

    startupProbe:
      httpGet:
        path: /health
        port: 3000
      failureThreshold: 30
      periodSeconds: 2
```

## Lifecycle integration

When using `createLifecycle()` (Phase B), the handler automatically:

1. **Startup**: responds with `initializing` (`200`) until checks pass — use readiness probes for traffic gating
2. **Running**: responds with `operational` (`200`) — liveness and readiness probes succeed
3. **Shutdown** (`SIGTERM`): responds with `not-ready` (`503`) — Kubernetes readiness probe fails, load balancer drains connections
