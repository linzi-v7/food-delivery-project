FROM nginx:alpine

# Remove the default "Welcome to nginx" config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our gateway configuration as the main nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Run as non-root user for security
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/gateway-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
