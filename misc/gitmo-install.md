
# MissKey-Gitmo Install Setup

----

## Initial System Setup
- Initialize System..

### Set System `hostname` and `hosts`
- sudo nano /etc/hostname
- sudo nano /etc/hosts

### Reboot System
- sudo reboot

### Update System
- sudo apt-get update && sudo apt-get upgrade

## Install `Git` and tools
- sudo apt-get install -y git curl build-essential tmux htop

## Install `ufw`
- sudo apt-get install ufw

### Setup `ufw` ports and enable
1. sudo ufw allow ssh
2. sudo ufw allow http
3. sudo ufw allow https

#### Verify Steps #1-3 Are Complete!
4. sudo ufw enable

### Check `ufw` status
- sudo ufw status

----

### Install `nodejs` - Version 14.x is LTS!
- curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
- sudo apt-get install -y nodejs

##### Check node Version
- node -v

#### Update packages
- sudo apt-get update

### Install `postgresql`
1. sudo apt install -y postgresql postgresql-contrib
2. *Check postgresql Status* (optional)
	- sudo systemctl status postgresql
3. Create database and user - *Login to postgresql as Root*
  - sudo -u postgres psql
	  1. `create database mk1;`
	  2. `create user gitmo with encrypted password 'POSTGRES_SECURE_PASSWORD';`
	  3. `grant all privileges on database mk1 to gitmo;`
	  4. `exit`
4. *Postgresql is now setup.*

### Install `redis`
- sudo apt install -y redis-server
- Start redis server:
  - systemctl start redis-server
- Status redis server:
  - systemctl status redis-server
	- *`q` to quit.*
- *Redis is setup.*

### Install `yarn` globally via npm
- npm install --global yarn

### Install `nginx` - (prep)
- sudo apt-get install -y nginx

----

# Configure `nginx` for misskey-gitmo

### NOTICE!
- This assumes you have some knowledge of nginx and know your way around an nginx conf file.  
- You might have to toggle config port options for certificate setup.
  - You may need to comment out the ssl setup, for letsencrypt init.
- Instructions for both options of provided MissKey nginx conf, and modified example are below.

### Use misskey example gitmo `nginx` site..
- cp /home/gitmo/gitmo/docs/examples/misskey.nginx /etc/nginx/sites-enabled/misskey
- *Modify `/etc/nginx/sites-enabled/misskey`* ...
- *Test `nginx` Config:*
  - sudo nginx -t
- *Apply `nginx` Config:*
	- sudo nginx -s reload

#### OR...

### Create gitmo `nginx` site
- nano /etc/nginx/sites-enabled/gitmo

*Then..*

#### Setup gitmo `nginx` site config with following:
```bash
# nginx configuration for Misskey
#
# 1. Replace gitmo.life to your domain
# 2. Install to /etc/nginx/sites-enabled/
# 3. Reload config with: sudo nginx -s reload

# For WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=cache1:16m max_size=1g inactive=720m use_temp_path=off;

server {
    # Listen HTTP
    listen 80;
    listen [::]:80;
    server_name  gitmo.life;

    # For SSL domain validation
    root /var/www/html;
    location /.well-known/acme-challenge/ { allow all; }
    location /.well-known/pki-validation/ { allow all; }
    location / { return 301 https://gitmo.life$request_uri; }
}

server {
    # For www. redirect
    server_name  www.gitmo.life;
    return 301 $scheme://gitmo.life$request_uri;
}

server {
    # Listen HTTPS
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name  gitmo.life;
    ssl_session_cache shared:ssl_session_cache:10m;

    # To use Let's Encrypt certificate
    ssl_certificate     /etc/letsencrypt/live/gitmo.life/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gitmo.life/privkey.pem;

    # SSL protocol settings
    ssl_protocols TLSv1.2;
    ssl_prefer_server_ciphers on;

    # Change to your upload limit
    client_max_body_size 80m;

    # Proxy to Node
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_redirect off;

        # If it's behind another reverse proxy or CDN, remove the following.
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # For WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Cache settings
        proxy_cache cache1;
        proxy_cache_lock on;
        proxy_cache_use_stale updating;
        add_header X-Cache $upstream_cache_status;
    }
}
```

#### Reload `nginx`
- sudo nginx -s reload

----

# Setup Certificates (SSL/TLS)

### *WARNING!*
This part gets a bit derpy if using cloudflare vs plain nginx.
Please verify your setup before proceeding!

## Using Cloudflare...

#### Install Certbot for `cloudflare`
sudo apt-get install python3-certbot-dns-cloudflare

#### Setup cloudflare.ini secrets
- mkdir /etc/cloudflare
- nano /etc/cloudflare/cloudflare.ini

#### Create Cert..
- certbot certonly --dns-cloudflare --dns-cloudflare-credentials /etc/cloudflare/cloudflare.ini --dns-cloudflare-propagation-seconds 60 --server https://acme-v02.api.letsencrypt.org/directory -d gitmo.life -d *gitmo.life --dns-cloudflare --dns-cloudflare-credentials  /etc/cloudflare/cloudflare.ini --dns-cloudflare-propagation-seconds 50

## Using Standard...

#### Install Certbot for `nginx`
- sudo apt-get install python3-certbot-nginx
- sudo certbot --nginx -d gitmo.life -d *.gitmo.life

----

# Setup User & Clone the App:

## Add user for MissKey instance
- sudo adduser --disabled-password --disabled-login gitmo

## Clone using HTTPS:
- sudo -H -u gitmo git clone https://github.com/gitmolife/gitmo.git /home/gitmo/gitmo

### OR...

## Generate SSH Deploy Key for user:
- sudo -H -u gitmo ssh-keygen -o

#### Add this Key to your deploy server..
- sudo -H -u gitmo cat /home/gitmo/.ssh/id_rsa.pub

#### Clone the project to the created user home directory
- sudo -H -u gitmo git clone git@github.com:gitmolife/gitmo.git /home/gitmo/gitmo

# Checkout the Project:

### Use `sudo su` to attach to app user
- sudo su gitmo

### Change Directory to gitmo app (as user)
- cd ~/gitmo/

### Checkout `gitmo-develop` Branch from git
- git checkout gitmo-develop
### Pull `gitmo-develop` Branch from git origin
- git pull origin gitmo-develop

### Run yarn for initial setup
- yarn

### Copy Default config
- cp .config/example.yml .config/default.yml

### Modify config
- nano .config/default.yml

#### Setup site variables
- url: `https://gitmo.life/`
- port: `3000`
- db:
  - host: `localhost`
  - port: `5432`
  - db: `mk1`
  - user: `gitmo`
  - pass: `POSTGRES_SECURE_PASSWORD`

---

## Build misskey-gitmo App
- NODE_ENV=production yarn build

---

## Initialize misskey-gitmo Database - *run only once!*
- yarn run init

- *Run the above command only a freshly created empty databse.*

---

## Start misskey-gitmo App
- NODE_ENV=production npm start

---

## Stop misskey-gitmo App
- `CTRL + C` - End console instance

---

# Warden Script Setup - *Custom*

- Uses `tmux` worker shell wrapper.
- Self Error Checking Script
- Automates Update Installs
- Control Start/Stop of App
- Attachable Shell to active App

### Setup Warden
- Set script file permissions
	- `chmod 755 misc/warden`
- Copy `default_example.env` to `.env` and set desired variables.
  - `cp .config/default_example.env .config/.env`

### Warden.sh Usage
- `/home/gitmo/gitmo/misc/warden` - Show script commands
- `/home/gitmo/gitmo/misc/warden debug` - Checks Script setup
- `/home/gitmo/gitmo/misc/warden start` - Starts the misskey-gitmo instance
- `/home/gitmo/gitmo/misc/warden attach` - Attach to the tmux shell
- `/home/gitmo/gitmo/misc/warden stop` - Terminate the misskey-gitmo shell
- `/home/gitmo/gitmo/misc/warden upgrade` - Upgrade the gitmo codebase
- `/home/gitmo/gitmo/misc/warden upgrade-live` - Upgrade the gitmo codebase if running
- `/home/gitmo/gitmo/misc/warden fixpermissions` - Applies App file permissions
