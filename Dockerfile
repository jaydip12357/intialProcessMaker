FROM nginx:alpine

# Copy the static HTML file
COPY index.html /usr/share/nginx/html/index.html

# Copy nginx config as a template (nginx will substitute $PORT at runtime)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Expose port (Railway will provide PORT env var)
EXPOSE 80
