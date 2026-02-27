# Build stage - compile Java backend only
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage - minimal JDK image
FROM eclipse-temurin:17-jdk
WORKDIR /app
COPY --from=builder /build/target/booking-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8081
ENV PORT=8081
ENTRYPOINT ["java", "-jar", "/app.jar"]
