import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar

plugins {
    kotlin("jvm") version "1.9.23"
    id("com.github.johnrengelman.shadow") version "8.1.1"
    application
}

group = "com.erd"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    // Javalin
    implementation("io.javalin:javalin:6.3.0")

    // Jackson
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.17.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.17.0")

    // Database
    implementation("org.xerial:sqlite-jdbc:3.45.3.0")
    implementation("com.zaxxer:HikariCP:5.1.0")

    // JDBC drivers for DB schema import
    runtimeOnly("com.mysql:mysql-connector-j:8.3.0")
    runtimeOnly("org.postgresql:postgresql:42.7.3")
    runtimeOnly("com.microsoft.sqlserver:mssql-jdbc:12.4.2.jre11")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // BCrypt
    implementation("org.mindrot:jbcrypt:0.4")

    // Logging
    implementation("ch.qos.logback:logback-classic:1.5.6")

    // Test
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    testImplementation("org.assertj:assertj-core:3.25.3")
    testImplementation("io.javalin:javalin-testtools:6.3.0")
}

application {
    mainClass.set("com.erd.AppKt")
}

kotlin {
    jvmToolchain(17)
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named<ShadowJar>("shadowJar") {
    archiveBaseName.set("erd")
    archiveClassifier.set("")
    archiveVersion.set("")
    mergeServiceFiles()
}

// Build frontend and copy to backend resources
val frontendDir = file("../frontend")
val frontendBuildDir = file("../frontend/dist")

val isWindows = System.getProperty("os.name").lowercase().contains("win")
val npmCmd = if (isWindows) listOf("cmd", "/c", "npm") else listOf("npm")

val npmInstall = tasks.register<Exec>("npmInstall") {
    workingDir = frontendDir
    commandLine(npmCmd + listOf("install"))
    inputs.file("$frontendDir/package.json")
    outputs.dir("$frontendDir/node_modules")
}

val buildFrontend = tasks.register<Exec>("buildFrontend") {
    dependsOn(npmInstall)
    workingDir = frontendDir
    commandLine(npmCmd + listOf("run", "build"))
    inputs.dir("$frontendDir/src")
    inputs.file("$frontendDir/index.html")
    outputs.dir(frontendBuildDir)
}

val copyFrontend = tasks.register<Copy>("copyFrontend") {
    dependsOn(buildFrontend)
    from(frontendBuildDir)
    into("src/main/resources/public")
}

tasks.processResources {
    dependsOn(copyFrontend)
}

tasks.build {
    dependsOn(tasks.named("shadowJar"))
}
