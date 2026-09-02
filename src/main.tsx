import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SOS_APP_MARK } from './brandIcon';
import './styles.css';
import './brand-fix.css';

// index.html não define favicon: sem isto a aba do navegador/janela usa o ícone
// genérico do navegador em vez da marca S.O.S. O SVG é embutido (data URI), então
// funciona offline e sem depender de nenhum arquivo externo (public/*.png não é usado).
const favicon=document.createElement('link');
favicon.rel='icon';
favicon.href=SOS_APP_MARK;
document.head.appendChild(favicon);

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
