# Infrastructure and Design Decisions

## Compute & Instance Sizing

The application is deployed on an AWS EC2 `c7i-flex.large` instance. This instance type was selected because it provides sufficient CPU and memory resources to run Docker containers, Jenkins, Nginx, and application workloads simultaneously while leaving headroom for CI/CD operations. The instance offers a good balance between performance and cost for a small production-style environment.

---

# Security Groups and Firewall Rules

The infrastructure follows the principle of least privilege. Only required ports are exposed.

| Port | Purpose     | Source                         | Reason                                                                         |
| ---- | ----------- | ------------------------------ | ------------------------------------------------------------------------------ |
| 22   | SSH         | Specific trusted IP range only | Administrative access to the server. Not exposed publicly.                     |
| 80   | HTTP        | 0.0.0.0/0                      | Used for HTTP traffic and Let's Encrypt certificate validation.                |
| 443  | HTTPS       | 0.0.0.0/0                      | Secure access to the application.                                              |
| 9090 | Jenkins UI  | Restricted IP range            | Access to Jenkins dashboard. Non-public administrative service.                |
| 3000 | Application | localhost only                 | Internal application port behind Nginx reverse proxy. Not publicly accessible. |

No ports other than those required by the application are exposed.

SSH access is restricted to trusted IP ranges and is not open to the internet.

---

# Jenkins Configuration

Jenkins runs inside Docker and listens on port 9090 instead of the default port 8080.

Port 9090 was selected to avoid conflicts with application services and to make administrative traffic easily distinguishable from application traffic.

---

# Health Check and Failure Definition

After deployment, the pipeline performs application health validation through the `/health` endpoint.

A deployment is considered successful only when:

* HTTP response code is 200.
* Application status is healthy.
* Database connectivity check succeeds.

Failure conditions:

* Any response code other than 200.
* Database connection failure.
* Timeout exceeding 10 seconds.
* Five consecutive failed health checks.

If five retries fail, the deployment is marked unhealthy and automatic rollback is triggered.

---

# Secrets Handling

## Build Time

No database credentials are required during image build. Docker images are built without embedding secrets.

## Deploy Time

Database credentials are stored securely inside Jenkins credentials and injected during deployment through environment variables.

## Runtime

Application containers receive database credentials through environment variables. Secrets are never committed to Git and are never baked into Docker image layers.

---

# Deploy and Rollback Downtime

Deployment uses an in-place strategy.

During deployment, the existing container is replaced with the newly deployed container. A short interruption may occur while containers are restarted.

If health checks fail, the previous stable version is automatically restored.

In-flight requests during deployment or rollback may experience temporary interruption, but service availability is restored automatically without manual intervention.

---

# Local vs Production Database Strategy

Local development uses Docker Compose with a PostgreSQL container to provide an isolated development environment.

Production uses AWS RDS PostgreSQL because managed databases provide:

* Automated backups.
* Better reliability.
* Independent scaling.
* Maintenance and patch management.
* Persistent storage separated from the application server.

Deploying the Docker Compose database container directly to production would introduce several operational risks:

* Data loss if the instance fails.
* Lack of automated backups.
* Tight coupling between database and application.
* Difficult scaling and maintenance.
* Single point of failure.

Therefore, production uses Amazon RDS while Docker Compose databases are limited to development purposes.

---

# IAM Read-Only User Scope

The reviewer IAM user follows least privilege and contains only the permissions necessary to verify the environment.

### EC2

* DescribeInstances
* DescribeVolumes
* DescribeAddresses
* DescribeSecurityGroups

Purpose:
Allows inspection of compute resources without modification rights.

### RDS

* DescribeDBInstances
* DescribeDBSubnetGroups

Purpose:
Allows verification of database configuration and connectivity.

### CloudWatch

* GetMetricData
* ListMetrics

Purpose:
Allows viewing performance metrics.

### CloudWatch Logs

* DescribeLogGroups
* GetLogEvents

Purpose:
Allows read-only access to application logs.

No write, modify, terminate, or administrative permissions are granted.

Broad managed policies such as AWS ReadOnlyAccess were intentionally avoided to ensure permissions remain narrowly scoped according to the principle of least privilege.
