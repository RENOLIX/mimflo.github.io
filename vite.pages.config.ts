import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 root:'pages',base:'/mimflo.github.io/',publicDir:'../public',
 resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},
 define:{'process.env.NEXT_PUBLIC_GITHUB_PAGES':'true'},
 plugins:[{name:'pages-paths',enforce:'pre',transform(code,id){if(!/\.(tsx?|jsx?)$/.test(id)||id.includes('node_modules'))return;return code.replaceAll('/assets/','/mimflo.github.io/assets/').replaceAll('href="/signin-with-chatgpt','href="https://mimflo-voix.confortzone7142.chatgpt.site/signin-with-chatgpt').replaceAll('href="/signout-with-chatgpt','href="https://mimflo-voix.confortzone7142.chatgpt.site/signout-with-chatgpt')}},react()],
 build:{outDir:'../pages-dist',emptyOutDir:true},
});
