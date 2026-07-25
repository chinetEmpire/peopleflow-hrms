04:20:26.121 Running build in Washington, D.C., USA (East) – iad1
04:20:26.121 Build machine configuration: 2 cores, 8 GB
04:20:26.227 Cloning github.com/chinetEmpire/peopleflow-hrms (Branch: main, Commit: 0c634bf)
04:20:26.228 Previous build caches not available.
04:20:29.066 Cloning completed: 2.839s
04:20:29.676 Running "vercel build"
04:20:29.694 Vercel CLI 56.5.0
04:20:30.105 Installing dependencies...
04:20:42.874 
04:20:42.875 added 505 packages in 13s
04:20:42.876 
04:20:42.876 156 packages are looking for funding
04:20:42.876   run `npm fund` for details
04:20:42.919 Detected Next.js version: 15.5.21
04:20:42.926 Running "npm run build"
04:20:43.029 
04:20:43.030 > nextjs@0.1.0 build
04:20:43.030 > next build
04:20:43.031 
04:20:43.569 Attention: Next.js now collects completely anonymous telemetry regarding usage.
04:20:43.569 This information is used to shape Next.js' roadmap and prioritize features.
04:20:43.570 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
04:20:43.570 https://nextjs.org/telemetry
04:20:43.570 
04:20:43.652    ▲ Next.js 15.5.21
04:20:43.652 
04:20:43.684    Creating an optimized production build ...
04:20:58.891  ✓ Compiled successfully in 12.8s
04:20:58.894    Skipping linting
04:20:58.895    Checking validity of types ...
04:21:06.373    Collecting page data ...
04:21:08.562    Generating static pages (0/15) ...
04:21:09.570 Error occurred prerendering page "/_not-found". Read more: https://nextjs.org/docs/messages/prerender-error
04:21:09.570 Error: Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See SUPABASE_SETUP.md.
04:21:09.571     at 59009 (.next/server/chunks/75.js:1:14146)
04:21:09.571     at c (.next/server/webpack-runtime.js:1:127)
04:21:09.571     at 69333 (.next/server/chunks/75.js:1:14499)
04:21:09.572     at Object.c [as require] (.next/server/webpack-runtime.js:1:127) {
04:21:09.572   digest: '1966738071'
04:21:09.572 }
04:21:09.573 Export encountered an error on /_not-found/page: /_not-found, exiting the build.
04:21:09.578  ⨯ Next.js build worker exited with code: 1 and signal: null
04:21:09.635 Error: Command "npm run build" exited with 1