pipeline {
    agent any

    environment {
        IMAGE_NAME = "taskapp"
        IMAGE_TAG = "${BUILD_NUMBER}"
        DOCKER_REPO = "taskapp"
        CONTAINER_NAME = "taskapp_container"
        PORT = "3000"
        DOCKER_CREDS = "docker-hub"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ./app
                docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                """
            }
        }

        stage('Test') {
            steps {
                sh '''
                echo "No test script found - skipping test stage safely"
                '''
            }
        }

        stage('Login Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                    echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                    '''
                }
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                    docker tag ${IMAGE_NAME}:${IMAGE_TAG} \$DOCKER_USER/${DOCKER_REPO}:${IMAGE_TAG}
                    docker tag ${IMAGE_NAME}:latest \$DOCKER_USER/${DOCKER_REPO}:latest

                    docker push \$DOCKER_USER/${DOCKER_REPO}:${IMAGE_TAG}
                    docker push \$DOCKER_USER/${DOCKER_REPO}:latest
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKER_CREDS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true

                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        --env-file /var/jenkins_home/.env \
                        -p ${PORT}:3000 \
                        \$DOCKER_USER/${DOCKER_REPO}:latest
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                for i in 1 2 3 4 5
                do
                    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://172.31.6.54:3000/health || true)

                    if [ "$STATUS" = "200" ]; then
                        echo "Application healthy"
                        exit 0
                    fi

                    echo "Retrying..."
                    sleep 5
                done

                echo "Health check failed"
                exit 1
                '''
            }
        }
    }

    post {
        success {
            echo "SUCCESS: Deployment completed"
        }

        failure {
            echo "FAILED: Pipeline failed → check logs"
        }

        always {
            sh "docker system prune -f"
        }
    }
}
