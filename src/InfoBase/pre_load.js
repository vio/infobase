import 'spin.js/spin.css';
import { Spinner } from 'spin.js';
window.Spinner = Spinner;

export default function(){

  const app_el = document.querySelector('#app');
  const spinner = new Spinner({scale:4});
  spinner.spin(app_el);
  app_el.setAttribute('aria-busy', 'true');

  return function stop(){
    spinner.stop();
    app_el.removeAttribute('aria-busy')
  }
} 
