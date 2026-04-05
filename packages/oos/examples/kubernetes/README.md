# Kubernetes Integration

OOS health endpoints work natively with Kubernetes probes — no sidecar, no custom logic.

## How OOS maps to Kubernetes probes

| Kubernetes probe | OOS behaviour | HTTP status |
|---|---|---|
| **Liveness** | `operational` / `degraded` / `partial-outage` → alive | `200` |
| | `down` / `unreachable` → dead | `503` |
| **Readiness** | `operational` / `ready` → ready | `200` |
| | `initializing` / `not-ready` → not ready | `503` |
| **Startup** | `initializing` → still starting | `503` |
| | Any other condition → started | `200` |

Kubernetes probes only look at the HTTP status code (`200` = success, anything else = failure). OOS produces the correct status codes automatically via `suggestHttpStatus()`.

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

1. **Startup**: responds with `initializing` (`503`) until checks pass → Kubernetes startup probe keeps retrying
2. **Running**: responds with `operational` (`200`) → liveness and readiness probes succeed
3. **Shutdown** (`SIGTERM`): responds with `not-ready` (`503`) → Kubernetes readiness probe fails, load balancer drains connections

This matches the Kubernetes graceful shutdown pattern exactly.
