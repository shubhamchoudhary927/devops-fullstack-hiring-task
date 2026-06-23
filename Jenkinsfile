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
                sh '''
                docker build -t taskapp:${BUILD_NUMBER} ./app
                docker tag taskapp:${BUILD_NUMBER} taskapp:latest
                '''
            }
        }

        stage('Test (Skip Safe)') {
            steps {
                sh '''
                echo "No test script found - skipping test stage"
                '''
            }
        }

        stage('Login to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "docker-hub",
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
                    credentialsId: "docker-hub",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                    docker tag taskapp:${BUILD_NUMBER} $DOCKER_USER/taskapp:${BUILD_NUMBER}
                    docker tag taskapp:latest $DOCKER_USER/taskapp:latest

                    docker push $DOCKER_USER/taskapp:${BUILD_NUMBER}
                    docker push $DOCKER_USER/taskapp:latest
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "docker-hub",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                    docker stop taskapp_container || true
                    docker rm taskapp_container || true

                    docker run -d \
                        --name taskapp_container \
                        -p 3000:3000 \
                        $DOCKER_USER/taskapp:latest
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                for i in 1 2 3 4 5
                do
                    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || true)

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
            echo "SUCCESS: Deployment done"
        }

        failure {
            echo "FAILED: Build failed"
        }

        always {
            sh "docker system prune -f"
        }
    }
}
