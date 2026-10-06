import React from 'react';
import {createRoot} from 'react-dom/client';
import MimFlo from '../app/mimflo';
import '../app/globals.css';
import '../app/home.css';
createRoot(document.getElementById('root')!).render(<MimFlo initialHash={window.location.hash}/>);
