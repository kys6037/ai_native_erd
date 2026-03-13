FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY backend/ .
RUN mkdir -p src/main/resources/public
RUN gradle shadowJar -x npmInstall -x buildFrontend -x copyFrontend --no-daemon

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/erd.jar .
EXPOSE 8080
CMD ["java", "-Xmx128m", "-jar", "erd.jar"]
