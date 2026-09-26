# Phase B deploy — run ONLY after docs.gurouter.com DNS resolves to 14.225.254.130.
# Verify first: nslookup docs.gurouter.com  (must NOT be NXDOMAIN)
#
# 1. Ship the built static site (run from gurouter-docs/ on the build machine):
#      rsync -avz --delete dist/ vps-prod:/var/www/docs.gurouter.com/
#
# 2. Install + enable the vhost (on master via vps-prod):
#      scp deploy/docs.gurouter.com.conf vps-prod:/etc/nginx/sites-enabled/docs.gurouter.com.conf
#      ssh vps-prod 'mkdir -p /var/www/docs.gurouter.com && nginx -t && systemctl reload nginx'
#
# 3. TLS: origin certificate via certbot + nginx plugin (DONE — 2026-09-23).
#    Cloudflare is Full/Full(strict) and does TLS to the origin, so the origin
#    must present a valid cert. Issued with:
#      ssh vps-prod 'certbot --nginx -d docs.gurouter.com --non-interactive \
#        --agree-tos --register-unsafely-without-email --redirect'
#    The --redirect flag makes certbot add the http->https redirect to the vhost.
#    NO ACME account email was supplied (--register-unsafely-without-email);
#    attach one later with: certbot update_account --email you@example.com
#    Renewal is automatic via the standard certbot systemd timer (no manual step).
#    Verify the origin cert directly (bypassing Cloudflare):
#      echo | openssl s_client -connect 14.225.254.130:443 -servername docs.gurouter.com 2>/dev/null \
#        | openssl x509 -noout -subject -dates   # expect CN=docs.gurouter.com + future notAfter
#
# 4. Verify:
#      curl -s -o /dev/null -w '%{http_code}\n' https://docs.gurouter.com/
#      curl -s https://docs.gurouter.com/api/systemone/ | grep -o '<title>[^<]*</title>'
#      curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: docs.gurouter.com' http://14.225.254.130/
#
# Rollback: ssh vps-prod 'rm /etc/nginx/sites-enabled/docs.gurouter.com.conf && systemctl reload nginx'
# (Gateway on :3050 and all other vhosts are untouched by this deploy.)
