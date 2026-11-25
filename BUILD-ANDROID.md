# Build OrbitSchool for Google Play (Trusted Web Activity)

I cannot produce a signed Android bundle for you: it needs your own signing key, domain and Play account. These steps do it.

1. **Host it over HTTPS.** Deploy this folder to Netlify (it already has netlify.toml). Note your URL, e.g. `https://your-site.netlify.app`.
2. **Fill the placeholders.** Replace `YOUR-SITE.netlify.app` in `twa-manifest.json`, choose a real `packageId` (e.g. `com.yourname.orbitschool`, permanent once published) and use it in `.well-known/assetlinks.json` too. Edit `privacy.html` (name, email, date) and make sure it is live at `https://YOUR-SITE.netlify.app/privacy.html`.
3. **Create the Android project.** Easiest: open https://www.pwabuilder.com, enter your URL, choose Android, and use the package ID above. Alternative: `npm i -g @bubblewrap/cli`, then `bubblewrap init --manifest https://YOUR-SITE.netlify.app/manifest.webmanifest` and `bubblewrap build`. Make sure the tool version targets **API 36 or higher** (see PLAY-STORE-READINESS.md).
4. **Connect the app to your site.** In Play Console, after uploading the first bundle, copy the **SHA-256 certificate fingerprint** from *Test and release > App integrity > App signing* into `.well-known/assetlinks.json`, redeploy, and confirm it loads at `/.well-known/assetlinks.json`. Without this the app shows a browser address bar.
5. **Store listing assets.** Typically a 512x512 icon (use `icons/orbit-icon-512.png`), a 1024x500 feature graphic, and at least two phone screenshots taken from the real app. Check the exact current sizes in Play Console.
6. **Console tasks.** Privacy policy URL, Data safety form, content rating, target audience (students/children triggers extra Families rules), and, for new personal accounts, a closed test with 12 testers for 14 days. Full list: PLAY-STORE-READINESS.md.
7. **Test on real phones** (back button, offline, rotation, keyboard, the 3D world on low-end devices) before submitting.
