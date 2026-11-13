# Venndann status

The public status page of Venndann, at https://venndannorg.github.io/status/.

Every five minutes a scheduled workflow checks the Inferra api, the website, the documentation and the platform console from outside Venndann's own servers, and keeps a daily record of the last 90 days on the `data` branch, as a single commit. The page reads that record; it needs no build.
