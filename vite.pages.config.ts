import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 root:'pages',base:'/',publicDir:'../public',
 resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},
 define:{'process.env.NEXT_PUBLIC_GITHUB_PAGES':'false','process.env.NEXT_PUBLIC_MEMBER_API':JSON.stringify(process.env.MIMFLO_MEMBER_API||'')},
 plugins:[react()],
 build:{outDir:'../pages-dist',emptyOutDir:true,rollupOptions:{input:{site:fileURLToPath(new URL('./pages/index.html',import.meta.url)),admin:fileURLToPath(new URL('./pages/admin/index.html',import.meta.url))}}},
});