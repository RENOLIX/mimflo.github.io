/* MimFlo adapter. DearFlip's original files are kept unmodified under /vendor/dearflip. */
(function(){
 let app=null,callbacks={},speech={},observer=null,highlightFrame=0,generation=0,pendingPage=null,navigationTimer=0;
 function flushNavigation(){clearTimeout(navigationTimer);if(!app||pendingPage===null)return;if(app.currentPageNumber===pendingPage+1){pendingPage=null;return}if(app.viewer?.isAnimating?.()){navigationTimer=setTimeout(flushNavigation,50);return}const target=pendingPage;pendingPage=null;app.gotoPage(target+1);if(app.currentPageNumber!==target+1){pendingPage=target;navigationTimer=setTimeout(flushNavigation,50)}}
 function highlight(){highlightFrame=0;document.querySelectorAll('[data-reading-word]').forEach(word=>{const index=Number(word.dataset.readingWord),range=speech.activeRange;word.classList.toggle('speaking',!!range&&index>=range.first&&index<range.last);word.classList.toggle('speaking-word',index===speech.activeWord);word.classList.toggle('resume',index===speech.pointWord);word.tabIndex=index===speech.pointWord?0:-1;word.setAttribute('aria-current',index===speech.activeWord?'true':'false')})}
 function scheduleHighlight(){if(!highlightFrame)highlightFrame=requestAnimationFrame(highlight)}
 function destroy(){clearTimeout(navigationTimer);pendingPage=null;observer?.disconnect();observer=null;if(highlightFrame)cancelAnimationFrame(highlightFrame);highlightFrame=0;app?.dispose();app=null}
 window.MimFloBook={
  open(pages,initialPage,handlers){destroy();callbacks=handlers;const run=++generation;const source=Array.from(pages,p=>p.image),links={};pages.forEach((p,index)=>{links[index+1]=p.links});
   jQuery(function(){if(run!==generation)return;app=jQuery('#book').flipBook(source,{is3D:true,webgl:true,has3DShadow:true,pageMode:DFLIP.PAGE_MODE.SINGLE,singlePageMode:DFLIP.SINGLE_PAGE_MODE.BOOKLET,openPage:initialPage+1,providerType:'image',height:'100%',paddingTop:7,paddingBottom:7,paddingLeft:9,paddingRight:9,flexibility:.9,flipbookHardPages:'none',enableSound:false,backgroundColor:'transparent',controlsPosition:'hide',allControls:'',leftControls:'',rightControls:'',moreControls:'',showDownloadControl:false,showSearchControl:false,showPrintControl:false,enableAnalytics:false,enableAutoLinks:false,maxTextureSize:2048,minTextureSize:256,duration:800,clickAction:DFLIP.MOUSE_CLICK_ACTIONS.NONE,links,text:{loading:'Préparation de votre lecture…'},onReady(instance){callbacks.onReady?.();callbacks.onPage?.(instance.currentPageNumber-1);scheduleHighlight()},onPageChanged(instance){callbacks.onPage?.(instance.currentPageNumber-1);scheduleHighlight()},onFlip(){scheduleHighlight()}});
   observer=new MutationObserver(scheduleHighlight);observer.observe(document.getElementById('book'),{childList:true,subtree:true});});
  },
  goTo(index){pendingPage=index;flushNavigation()},
  speech(value){speech=value;scheduleHighlight()},destroy,
  state(){return app?{page:app.currentPageNumber,count:app.pageCount,is3D:app.options?.is3D,pageMode:app.viewer?.pageMode,singlePageMode:app.viewer?.singlePageMode,animating:app.viewer?.isAnimating?.()}:null}
 };
 document.addEventListener('mousedown',event=>{if(event.target.closest('[data-reading-word]'))event.stopPropagation()},true);
 document.addEventListener('click',event=>{const word=event.target.closest('[data-reading-word]');if(word){event.preventDefault();event.stopPropagation();callbacks.onWord?.(Number(word.dataset.readingWord))}},true);
 document.addEventListener('keydown',event=>{const word=event.target.closest('[data-reading-word]');if(word&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();callbacks.onWord?.(Number(word.dataset.readingWord))}},true);
 window.addEventListener('error',event=>callbacks.onError?.(event.message||'Le lecteur n’a pas pu démarrer.'));
})();
