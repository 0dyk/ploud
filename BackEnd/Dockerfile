# Docker file

# jdk17
FROM openjdk:17-jdk

# work dir
WORKDIR /backend

# jar
ARG JAR_FILE=build/libs/*.jar

# jar file Copy
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java", "-Dspring.profiles.active=docker", "-jar", "app.jar"]
