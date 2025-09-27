proj13@project-1-13:~/flowisedockersetup202509$ sudo docker ps
CONTAINER ID   IMAGE                      COMMAND                  CREATED          STATUS                    PORTS                                         NAMES
258d08eabd9b   flowiseai/flowise:latest   "/bin/sh -c 'sleep 3…"   47 seconds ago   Up 35 seconds             0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp   flowise
ff6c8f0586ca   postgres:16-alpine         "docker-entrypoint.s…"   48 seconds ago   Up 46 seconds (healthy)   5432/tcp                                      flowise-postgres
b148e1060edc   chromadb/chroma:latest     "dumb-init -- chroma…"   48 seconds ago   Up 46 seconds             0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp   flowise-chroma
proj13@project-1-13:~/flowisedockersetup202509$ cd ../
proj13@project-1-13:~$ ls
change-docker-default-ip  flowisedockersetup202509  flowiseui  nginxsetupscriptssl  package-lock.json  snap
proj13@project-1-13:~$ cd flowiseui
proj13@project-1-13:~/flowiseui$ ls
deploy.sh  ecosystem.config.cjs  logs          package.json       PM2_DEPLOYMENT_GUIDE.md  TODO.md
dist       index.html            node_modules  package-lock.json  src                      vite.config.js
proj13@project-1-13:~/flowiseui$ cd ../
proj13@project-1-13:~$ sudo cat /etc/ngnix/sites-available/$HOSTNAME
cat: /etc/ngnix/sites-available/project-1-13: No such file or directory
proj13@project-1-13:~$ sudo cat /etc/nginx/sites-available/$HOSTNAME
server {
    listen 80;
    server_name project-1-13;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name project-1-13;
    ssl_certificate /etc/nginx/ssl/dept-wildcard.eduhk/fullchain.crt;
    ssl_certificate_key /etc/nginx/ssl/dept-wildcard.eduhk/dept-wildcard.eduhk.hk.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    ssl_trusted_certificate /etc/nginx/ssl/dept-wildcard.eduhk/fullchain.crt;

    # Default site root (customize if needed)
    #root /var/www/html;
    #index index.html index.htm;
    #location / {
    #    try_files $uri $uri/ =404;
    #}

    client_max_body_size 100M;  # Allows up to 100MB request bodies

#    location /projectui/ {
#        alias /home/proj13/flowiseui/dist/;
#        try_files $uri $uri/index.html /projectui/index.html;
#        index index.html;
#    }
#location /projectui {
#    alias /home/proj13/flowiseui/dist;
#    try_files $uri $uri/ /index.html;
#    index index.html;
#}

    location / {
        proxy_pass http://localhost:3000;  # Proxy to your app on port 3000
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

}
proj13@project-1-13:~$ cd flowiseui
proj13@project-1-13:~/flowiseui$ ls
deploy.sh  ecosystem.config.cjs  logs          package.json       PM2_DEPLOYMENT_GUIDE.md  TODO.md
dist       index.html            node_modules  package-lock.json  src                      vite.config.js
proj13@project-1-13:~/flowiseui$