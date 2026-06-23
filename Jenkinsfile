pipeline {
    agent any

    environment {
        IMAGE_NAME = "taskapp"
        IMAGE_TAG = "${BUILD_NUMBER}"
        LATEST_TAG = "latest"

        DOCKERHUB_REPO = "taskapp"   

        CONTAINER_NAME = "taskapp_container"
        PORT = "3000"
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
                docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${DOCKERHUB_REPO}:${IMAGE_TAG}
                docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${DOCKERHUB_REPO}:${LATEST_TAG}
                """
            }
        }

        stage('Test') {
            steps {
                sh """
                docker run --rm ${IMAGE_NAME}:${IMAGE_TAG} npm test
                """
            }
        }

        stage('Docker Hub Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                    echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                    """
                }
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                    echo "Pushing image to Docker Hub..."

                    docker tag ${IMAGE_NAME}:${IMAGE_TAG} $DOCKER_USER/${DOCKERHUB_REPO}:${IMAGE_TAG}
                    docker tag ${IMAGE_NAME}:${IMAGE_TAG} $DOCKER_USER/${DOCKERHUB_REPO}:${LATEST_TAG}

                    docker push $DOCKER_USER/${DOCKERHUB_REPO}:${IMAGE_TAG}
                    docker push $DOCKER_USER/${DOCKERHUB_REPO}:${LATEST_TAG}
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                sh """
                docker stop ${CONTAINER_NAME} || true
                docker rm ${CONTAINER_NAME} || true

                docker run -d \
                    --name ${CONTAINER_NAME} \
                    -p ${PORT}:3000 \
                    $DOCKER_USER/${DOCKERHUB_REPO}:${LATEST_TAG}
                """
            }
        }

        stage('Health Check') {
            steps {
                sh """
                for i in {1..5}
                do
                    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/health)

                    if [ "$STATUS" = "200" ]; then
                        echo "Application healthy"
                        exit 0
                    fi

                    echo "Retrying health check..."
                    sleep 5
                done

                exit 1
                """
            }
        }
    }

    post {

        success {
            echo "Pipeline SUCCESS  Deployment completed"
        }

        failure {
            echo "Pipeline FAILED Rolling back"

            sh """
            docker run -d \
                --name ${CONTAINER_NAME} \
                -p ${PORT}:3000 \
                $DOCKER_USER/${DOCKERHUB_REPO}:previous || true
            """
        }

        always {
            sh "docker system prune -f"
        }
    }
}