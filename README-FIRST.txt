BAM'S WEBSITE BUILDER - CLEAN URL PACKAGE

This package updates internal links to use clean URLs such as:
  /services
  /portfolio
  /login
instead of URLs ending in .html.

FIREBASE HOSTING
1. Use the included firebase.json.
2. If you already have a firebase.json, add these properties inside "hosting":
     "cleanUrls": true,
     "trailingSlash": false
3. Keep your existing rewrites, headers, redirects, and functions settings.
4. Deploy again with Firebase Hosting.

APACHE / CPANEL
Upload the included .htaccess file to the same root folder as index.html.

NETLIFY
Upload the included _redirects file to the published website folder.

IMPORTANT
- Use only the configuration for your hosting provider.
- Do not delete your existing Firebase settings when merging firebase.json.
- Keep the actual files named services.html, login.html, and so on. The server hides
  the extension; renaming the files is not required.
- Clear your browser cache after deployment.
