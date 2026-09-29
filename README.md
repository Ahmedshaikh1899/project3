# Customer Order Portal - Prometheus Metrics Enhancement

Adds Prometheus application metrics to the Customer Order Portal.

## Changes

- Adds `prom-client`
- Adds `GET /metrics`
- Adds HTTP request counter
- Adds HTTP request duration histogram
- Adds in-progress request gauge
- Adds default Node.js/process metrics
- Keeps `/`, `/orders`, `/health`, and `/ready`

## Local test

```bash
npm install
npm test
npm start
```

Then:

```bash
curl http://localhost:3000/metrics
```

You should see Prometheus exposition-format output.

## Kubernetes

The existing ServiceMonitor expects:

- Service: `shop3-service`
- Namespace: `default`
- Service label: `app: my-app`
- Service port name: `http`
- Port: `3000`
- Metrics path: `/metrics`

The Service should contain:

```yaml
metadata:
  labels:
    app: my-app
spec:
  ports:
    - name: http
      port: 3000
      targetPort: 3000
```

Use an immutable Docker image tag when deploying.

Do not commit real credentials.
