import React from 'react';
import {createRoot} from 'react-dom/client';
import AdminPage from '../../app/admin-page';
import '../../app/globals.css';
import '../../app/home.css';
createRoot(document.getElementById('root')!).render(<AdminPage/>);
