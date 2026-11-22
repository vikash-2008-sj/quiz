package com.college.quizportal.config;

import com.college.quizportal.model.User;
import com.college.quizportal.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTH_COOKIE_NAME = "cq_auth_token";
    public static final String XSRF_COOKIE_NAME = "XSRF-TOKEN";
    public static final String XSRF_HEADER_NAME = "X-XSRF-TOKEN";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Anonymity safeguard: never attach any user authentication context to public student endpoints
        if (path.startsWith("/api/public/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String bearerToken = extractBearerToken(request);
        String cookieToken = extractCookieValue(request, AUTH_COOKIE_NAME);
        boolean authenticatedViaCookieOnly = (bearerToken == null && cookieToken != null);
        String jwt = bearerToken != null ? bearerToken : cookieToken;

        if (jwt != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                // Double-submit CSRF verification for cookie-authenticated state-changing requests
                if (authenticatedViaCookieOnly && isStateChangingMethod(request.getMethod())) {
                    String xsrfCookie = extractCookieValue(request, XSRF_COOKIE_NAME);
                    String xsrfHeader = request.getHeader(XSRF_HEADER_NAME);
                    if (xsrfCookie == null || xsrfHeader == null || !xsrfCookie.equals(xsrfHeader)) {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"Invalid or missing CSRF token\"}");
                        return;
                    }
                }

                Claims claims = jwtService.parseAndValidate(jwt);
                String email = claims.getSubject();
                if (email != null) {
                    User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
                    if (user != null && user.isActive()) {
                        String roleAuthority = "ROLE_" + user.getRole().getName().name();
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            List.of(new SimpleGrantedAuthority(roleAuthority))
                        );
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            } catch (JwtException | IllegalArgumentException ignored) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            return token.isEmpty() ? null : token;
        }
        return null;
    }

    private String extractCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie c : cookies) {
            if (name.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }

    private boolean isStateChangingMethod(String method) {
        return "POST".equalsIgnoreCase(method)
            || "PUT".equalsIgnoreCase(method)
            || "PATCH".equalsIgnoreCase(method)
            || "DELETE".equalsIgnoreCase(method);
    }
}
