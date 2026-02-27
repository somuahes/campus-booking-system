package com.example.booking.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Parses Render's DATABASE_URL environment variable
 * (postgresql://user:pass@host/db)
 * and converts it into a properly configured HikariCP DataSource.
 *
 * This is needed because:
 * 1. Spring's datasource.url requires the "jdbc:" prefix.
 * 2. PostgreSQL JDBC driver does not accept credentials embedded in the URL.
 * 3. Render's internal URLs may have extra path segments.
 */
@Configuration
@ConditionalOnProperty(name = "DATABASE_URL")
public class DataSourceConfig {

    @Value("${DATABASE_URL}")
    private String databaseUrl;

    @Bean
    @Primary
    public DataSource dataSource() {
        try {
            // Strip "jdbc:" prefix if present (some env vars are set with it already)
            String rawUrl = databaseUrl.replaceFirst("^jdbc:", "");

            // Normalise scheme so java.net.URI can parse it (URI doesn't understand
            // postgresql://)
            String normalized = rawUrl
                    .replace("postgresql://", "http://")
                    .replace("postgres://", "http://");

            URI uri = new URI(normalized);

            String userInfo = uri.getUserInfo(); // "username:password"
            String username = userInfo.split(":")[0];
            String password = userInfo.split(":")[1];

            String host = uri.getHost();
            int port = uri.getPort(); // -1 if not present

            // Render's internal URL sometimes has extra path segments like
            // /routing_shard/actual_db_name — we use the LAST segment as the DB name.
            String fullPath = uri.getPath(); // e.g. /booking_db_fc6ca/booking_db_fc6c
            String dbPath = "/" + fullPath.substring(fullPath.lastIndexOf('/') + 1);

            String jdbcUrl = "jdbc:postgresql://" + host
                    + (port != -1 ? ":" + port : "")
                    + dbPath;

            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(jdbcUrl);
            config.setUsername(username);
            config.setPassword(password);
            config.setConnectionTimeout(30000);
            config.setMaximumPoolSize(10);
            config.setMinimumIdle(2);

            return new HikariDataSource(config);

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to parse DATABASE_URL: " + databaseUrl, e);
        }
    }
}
