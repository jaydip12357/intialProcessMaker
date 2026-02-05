FROM nginx:alpine

# Copy the static HTML file
COPY index.html /usr/share/nginx/html/index.html

# Copy nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Railway uses PORT env variable
ENV PORT=80
EXPOSE ${PORT}

CMD ["nginx", "-g", "daemon off;"]
